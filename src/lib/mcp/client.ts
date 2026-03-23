import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { mcpServers } from "@/lib/db/schema";
import type { McpServer } from "@/lib/db/schema";

interface DiscoveredTool {
  serverName: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

// Connection cache with TTL
const cache = new Map<
  string,
  { manager: McpClientManager; lastUsed: number }
>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cleanup stale connections periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.lastUsed > CACHE_TTL) {
      entry.manager.disconnect().catch(() => {});
      cache.delete(key); // eslint-disable-line drizzle/enforce-delete-with-where -- Map.delete, not Drizzle
    }
  }
}, 60_000);

export class McpClientManager {
  private clients: Map<string, Client> = new Map();
  private tools: DiscoveredTool[] = [];

  static async connectForUser(userId: string): Promise<McpClientManager> {
    // Check cache
    const cached = cache.get(userId);
    if (cached) {
      cached.lastUsed = Date.now();
      return cached.manager;
    }

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

    const transport = new SSEClientTransport(new URL(server.url), {
      requestInit: { headers },
    });

    const client = new Client({
      name: "KiviKova",
      version: "1.0.0",
    });

    await client.connect(transport);

    // Discover tools
    const { tools } = await client.listTools();
    for (const tool of tools) {
      this.tools.push({
        serverName: server.name,
        name: tool.name,
        description: tool.description ?? "",
        inputSchema: (tool.inputSchema ?? {}) as Record<string, unknown>,
      });
    }

    this.clients.set(server.name, client);
  }

  /**
   * Get all discovered tools formatted for Vercel AI SDK.
   * Tools are namespaced as mcp_<serverName>_<toolName>.
   */
  getVercelTools(): Record<
    string,
    {
      description: string;
      parameters: Record<string, unknown>;
      execute: (args: unknown) => Promise<unknown>;
    }
  > {
    const result: Record<
      string,
      {
        description: string;
        parameters: Record<string, unknown>;
        execute: (args: unknown) => Promise<unknown>;
      }
    > = {};

    for (const tool of this.tools) {
      const safeName = `mcp_${tool.serverName.replace(/\W/g, "_")}_${tool.name}`;
      const client = this.clients.get(tool.serverName);
      if (!client) continue;

      result[safeName] = {
        description: `[${tool.serverName}] ${tool.description}`,
        parameters: tool.inputSchema,
        execute: async (args: unknown) => {
          const response = await client.callTool({
            name: tool.name,
            arguments: (args ?? {}) as Record<string, unknown>,
          });
          return response;
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
      name: `mcp_${tool.serverName.replace(/\W/g, "_")}_${tool.name}`,
      description: `[${tool.serverName}] ${tool.description}`,
      parameters: tool.inputSchema,
    }));
  }

  /**
   * Call a tool by its namespaced name.
   */
  async callTool(
    namespacedName: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    // Parse mcp_<serverName>_<toolName>
    const match = namespacedName.match(/^mcp_(.+?)_([^_]+)$/);
    if (!match) throw new Error(`Invalid MCP tool name: ${namespacedName}`);

    const [, serverNameRaw, toolName] = match;
    const serverName = serverNameRaw.replace(/_/g, " ");

    // Try exact match first, then fuzzy
    let client = this.clients.get(serverName);
    if (!client) {
      // Try matching with underscores
      for (const [name, c] of this.clients) {
        if (name.replace(/\W/g, "_") === serverNameRaw) {
          client = c;
          break;
        }
      }
    }

    if (!client) throw new Error(`MCP server not found: ${serverName}`);

    return client.callTool({ name: toolName, arguments: args });
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
  }
}
