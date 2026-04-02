import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { mcpServers } from "@/lib/db/schema";
import { buildAuthHeaders, buildAuthUrl } from "@/lib/mcp/auth";
import { VernixOAuthProvider } from "@/lib/mcp/oauth-provider";
import { isSsrfUrl } from "@/lib/mcp/transport";
import { probe } from "@/lib/mcp/probe";
import { rateLimitByIp } from "@/lib/rate-limit";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = rateLimitByIp(request, "mcp-server-tools", {
    interval: 60_000,
    limit: 30,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const { id } = await params;

  const [server] = await db
    .select()
    .from(mcpServers)
    .where(and(eq(mcpServers.id, id), eq(mcpServers.userId, user.id)));

  if (!server) {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
  }

  const disabledSet = new Set(server.disabledTools ?? []);

  // Return cached tools if fresh
  if (
    server.cachedTools &&
    server.toolsCachedAt &&
    Date.now() - server.toolsCachedAt.getTime() < CACHE_TTL_MS
  ) {
    return NextResponse.json({
      tools: server.cachedTools.map((t) => ({
        ...t,
        enabled: !disabledSet.has(t.name),
      })),
      cachedAt: server.toolsCachedAt,
    });
  }

  // Live probe
  if (isSsrfUrl(server.url)) {
    return NextResponse.json(
      { error: "URL resolves to a private or restricted address" },
      { status: 400 }
    );
  }

  const headers = buildAuthHeaders(server);
  const url = buildAuthUrl(server.url, server);
  const authProvider =
    server.authType === "oauth"
      ? new VernixOAuthProvider(user.id, server.id, server.url)
      : undefined;

  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error("Connection timed out")),
      10_000
    );
  });

  try {
    const result = await Promise.race([
      probe(url, headers, authProvider),
      timeout,
    ]);
    clearTimeout(timeoutId!);

    // Update cache
    const now = new Date();
    db.update(mcpServers)
      .set({ cachedTools: result.tools, toolsCachedAt: now })
      .where(eq(mcpServers.id, id))
      .catch((e) =>
        console.warn(
          "[MCP] Failed to cache tools:",
          e instanceof Error ? e.message : e
        )
      );

    return NextResponse.json({
      tools: result.tools.map((t) => ({
        ...t,
        enabled: !disabledSet.has(t.name),
      })),
      cachedAt: now,
    });
  } catch {
    clearTimeout(timeoutId!);
    // If probe fails but we have stale cache, return it
    if (server.cachedTools) {
      return NextResponse.json({
        tools: server.cachedTools.map((t) => ({
          ...t,
          enabled: !disabledSet.has(t.name),
        })),
        cachedAt: server.toolsCachedAt,
        stale: true,
      });
    }
    return NextResponse.json(
      { error: "Failed to fetch tools" },
      { status: 502 }
    );
  }
}
