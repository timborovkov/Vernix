import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import { connectMcpClient } from "./transport";

export interface ProbeResult {
  toolCount: number;
  tools: { name: string; description: string }[];
}

/**
 * Probe an MCP server: connect, list tools, disconnect.
 * Reusable across test and tools endpoints.
 */
export async function probe(
  url: string,
  headers: Record<string, string>,
  authProvider?: OAuthClientProvider
): Promise<ProbeResult> {
  const client = await connectMcpClient(url, headers, authProvider);

  try {
    const { tools } = await client.listTools();
    return {
      toolCount: tools.length,
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description ?? "",
      })),
    };
  } finally {
    await client.close().catch(() => {});
  }
}
