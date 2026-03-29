import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";
import { jsonSchema } from "ai";
import { connectMcpClient } from "./transport";
import { buildAuthHeaders, buildAuthUrl } from "./auth";
import { VernixOAuthProvider } from "./oauth-provider";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { mcpServers } from "@/lib/db/schema";
import type { McpServer } from "@/lib/db/schema";

interface DiscoveredTool {
  serverId: string;
  serverName: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

// Reverse lookup: namespaced tool name → { serverId, originalToolName }
interface ToolMapping {
  serverId: string;
  originalName: string;
}

// Connection cache with TTL
const cache = new Map<
  string,
  { manager: McpClientManager; lastUsed: number }
>();
// Prevent concurrent connectForUser calls from creating duplicate managers
const pending = new Map<string, Promise<McpClientManager>>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cleanup stale connections periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cache) {
      if (now - entry.lastUsed > CACHE_TTL) {
        entry.manager.disconnect().catch(() => {});
        // eslint-disable-next-line drizzle/enforce-delete-with-where -- Map.delete
        cache.delete(key);
      }
    }
  }, 60_000);
}

/** Invalidate cached manager for a user (call when MCP config changes). */
export function invalidateMcpCache(userId: string): void {
  const entry = cache.get(userId);
  if (entry) {
    entry.manager.disconnect().catch(() => {});
    // eslint-disable-next-line drizzle/enforce-delete-with-where -- Map.delete
    cache.delete(userId);
  }
}

/** Ensure object schemas have a `properties` field — OpenAI rejects them without it. */
function normalizeSchema(
  schema: Record<string, unknown>
): Record<string, unknown> {
  if (schema.type === "object" && !schema.properties) {
    return { ...schema, properties: {} };
  }
  return schema;
}

export class McpClientManager {
  private clients: Map<string, Client> = new Map();
  private tools: DiscoveredTool[] = [];
  private toolMap: Map<string, ToolMapping> = new Map();

  static async connectForUser(userId: string): Promise<McpClientManager> {
    const cached = cache.get(userId);
    if (cached) {
      cached.lastUsed = Date.now();
      return cached.manager;
    }

    // Deduplicate concurrent calls for the same user
    const inflight = pending.get(userId);
    if (inflight) return inflight;

    const promise = McpClientManager.doConnect(userId);
    pending.set(userId, promise);
    try {
      return await promise;
    } finally {
      // eslint-disable-next-line drizzle/enforce-delete-with-where -- Map.delete
      pending.delete(userId);
    }
  }

  private static async doConnect(userId: string): Promise<McpClientManager> {
    const manager = new McpClientManager();

    const servers = await db
      .select()
      .from(mcpServers)
      .where(eq(mcpServers.userId, userId));

    const enabled = servers.filter((s) => s.enabled);

    const SERVER_TIMEOUT_MS = 10_000;
    for (const server of enabled) {
      try {
        await Promise.race([
          manager.connectToServer(server, userId),
          new Promise<never>((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    `Connection to "${server.name}" timed out after ${SERVER_TIMEOUT_MS}ms`
                  )
                ),
              SERVER_TIMEOUT_MS
            )
          ),
        ]);
      } catch (error) {
        // Don't log full error (may contain URLs with embedded API keys)
        const msg = error instanceof Error ? error.message : "Unknown error";
        console.error(`[MCP] Failed to connect to "${server.name}": ${msg}`);
      }
    }

    cache.set(userId, { manager, lastUsed: Date.now() });
    return manager;
  }

  private async connectToServer(
    server: McpServer,
    userId: string
  ): Promise<void> {
    const headers = buildAuthHeaders(server);
    const connectUrl = buildAuthUrl(server.url, server);

    // OAuth servers use the SDK's authProvider for automatic token management
    const authProvider =
      server.authType === "oauth"
        ? new VernixOAuthProvider(userId, server.id, server.url)
        : undefined;

    let client: Client;
    try {
      client = await connectMcpClient(connectUrl, headers, authProvider);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        console.warn(
          `[MCP] OAuth server "${server.name}" needs re-authorization`
        );
        return; // Skip this server — user needs to re-authorize via UI
      }
      throw err;
    }

    const { tools } = await client.listTools();
    for (const tool of tools) {
      const namespacedName = this.makeToolName(server.id, tool.name);
      this.tools.push({
        serverId: server.id,
        serverName: server.name,
        name: tool.name,
        description: tool.description ?? "",
        inputSchema: normalizeSchema(
          (tool.inputSchema ?? {}) as Record<string, unknown>
        ),
      });
      this.toolMap.set(namespacedName, {
        serverId: server.id,
        originalName: tool.name,
      });
    }

    this.clients.set(server.id, client);
  }

  /** Create a safe namespaced tool name using server ID to avoid collisions. */
  private makeToolName(serverId: string, toolName: string): string {
    return `mcp__${serverId.replace(/-/g, "")}__${toolName}`;
  }

  /**
   * Get all discovered tools formatted for Vercel AI SDK.
   * Wraps raw JSON Schema from MCP with jsonSchema() as required by AI SDK.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getVercelTools(): Record<string, any> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: Record<string, any> = {};

    for (const tool of this.tools) {
      const namespacedName = this.makeToolName(tool.serverId, tool.name);
      const client = this.clients.get(tool.serverId);
      if (!client) continue;

      result[namespacedName] = {
        description: `[${tool.serverName}] ${tool.description}`,
        inputSchema: jsonSchema(tool.inputSchema),
        execute: async (args: unknown) => {
          return client.callTool({
            name: tool.name,
            arguments: (args ?? {}) as Record<string, unknown>,
          });
        },
      };
    }

    return result;
  }

  /**
   * Get all discovered tools in OpenAI function calling format.
   */
  getOpenAITools(): Array<{
    type: "function";
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }> {
    return this.tools.map((tool) => ({
      type: "function" as const,
      name: this.makeToolName(tool.serverId, tool.name),
      description: `[${tool.serverName}] ${tool.description}`,
      parameters: tool.inputSchema,
    }));
  }

  /**
   * Call a tool by its namespaced name using the stored mapping.
   */
  async callTool(
    namespacedName: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    const mapping = this.toolMap.get(namespacedName);
    if (!mapping) throw new Error(`Unknown MCP tool: ${namespacedName}`);

    const client = this.clients.get(mapping.serverId);
    if (!client)
      throw new Error(`MCP server not connected: ${mapping.serverId}`);

    return client.callTool({ name: mapping.originalName, arguments: args });
  }

  async disconnect(): Promise<void> {
    for (const client of this.clients.values()) {
      try {
        await client.close();
      } catch {
        // Best effort
      }
    }
    this.clients.clear();
    this.tools = [];
    this.toolMap.clear();
  }
}
