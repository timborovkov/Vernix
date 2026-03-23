import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { jsonSchema } from "ai";
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

    for (const server of enabled) {
      try {
        await manager.connectToServer(server);
      } catch (error) {
        console.error(
          `Failed to connect to MCP server "${server.name}":`,
          error
        );
      }
    }

    cache.set(userId, { manager, lastUsed: Date.now() });
    return manager;
  }

  private async connectToServer(server: McpServer): Promise<void> {
    const headers: Record<string, string> = {};
    if (server.apiKey) {
      headers["Authorization"] = `Bearer ${server.apiKey}`;
    }

    const transport = new StreamableHTTPClientTransport(new URL(server.url), {
      requestInit: { headers },
    });

    const client = new Client({
      name: "KiviKova",
      version: "1.0.0",
    });

    await client.connect(transport);

    const { tools } = await client.listTools();
    for (const tool of tools) {
      const namespacedName = this.makeToolName(server.id, tool.name);
      this.tools.push({
        serverId: server.id,
        serverName: server.name,
        name: tool.name,
        description: tool.description ?? "",
        inputSchema: (tool.inputSchema ?? {}) as Record<string, unknown>,
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
