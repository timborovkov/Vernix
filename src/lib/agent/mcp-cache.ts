import type { ToolDescription } from "@/lib/agent/prompts";

interface CachedTools {
  tools: Array<{
    type: "function";
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
  descriptions: ToolDescription[];
  fetchedAt: number;
}

const MCP_CACHE_TTL_MS = 5 * 60_000; // 5 minutes

const mcpToolCache = new Map<string, CachedTools>();

// Periodically evict expired cache entries (same pattern as rate-limit.ts)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of mcpToolCache) {
      if (now - entry.fetchedAt >= MCP_CACHE_TTL_MS) {
        // eslint-disable-next-line drizzle/enforce-delete-with-where -- Map.delete
        mcpToolCache.delete(key);
      }
    }
  }, 60_000);
}

export function getMcpToolCache(meetingId: string): CachedTools | undefined {
  const cached = mcpToolCache.get(meetingId);
  if (cached && Date.now() - cached.fetchedAt < MCP_CACHE_TTL_MS) {
    return cached;
  }
  return undefined;
}

export function setMcpToolCache(meetingId: string, entry: CachedTools): void {
  mcpToolCache.set(meetingId, entry);
}

export function clearMcpToolCache(meetingId: string): void {
  // eslint-disable-next-line drizzle/enforce-delete-with-where -- Map.delete
  mcpToolCache.delete(meetingId);
}
