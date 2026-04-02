import { NextResponse } from "next/server";
import { z } from "zod/v4";
import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import { requireSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { mcpServers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { isSsrfUrl } from "@/lib/mcp/transport";
import { buildAuthHeaders, buildAuthUrl } from "@/lib/mcp/auth";
import { VernixOAuthProvider } from "@/lib/mcp/oauth-provider";
import { probe } from "@/lib/mcp/probe";

// Accept either an existing server ID or raw connection params for testing before saving
const testSchema = z.union([
  z.object({ id: z.uuid() }),
  z.object({
    url: z.url(),
    authType: z
      .enum(["none", "bearer", "header", "basic", "url_key"])
      .default("none"),
    authHeaderName: z.string().optional(),
    authHeaderValue: z.string().optional(),
    authKeyParam: z.string().optional(),
    authUsername: z.string().optional(),
    authPassword: z.string().optional(),
    // Legacy
    apiKey: z.string().optional(),
  }),
]);

export async function POST(request: Request) {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = testSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  let url: string;
  let headers: Record<string, string>;
  let authProvider: OAuthClientProvider | undefined;
  let serverId: string | undefined;

  if ("id" in parsed.data) {
    const [server] = await db
      .select()
      .from(mcpServers)
      .where(
        and(eq(mcpServers.id, parsed.data.id), eq(mcpServers.userId, user.id))
      );

    if (!server) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 });
    }

    url = buildAuthUrl(server.url, server);
    headers = buildAuthHeaders(server);
    serverId = server.id;
    if (server.authType === "oauth") {
      authProvider = new VernixOAuthProvider(user.id, server.id, server.url);
    }
  } else {
    url = buildAuthUrl(parsed.data.url, {
      authType: parsed.data.authType,
      authHeaderValue: parsed.data.authHeaderValue ?? null,
      authKeyParam: parsed.data.authKeyParam ?? null,
    });
    headers = buildAuthHeaders({
      authType:
        parsed.data.apiKey && parsed.data.authType === "none"
          ? "bearer"
          : parsed.data.authType,
      authHeaderName: parsed.data.authHeaderName ?? null,
      authHeaderValue: parsed.data.authHeaderValue ?? null,
      authUsername: parsed.data.authUsername ?? null,
      authPassword: parsed.data.authPassword ?? null,
      apiKey: parsed.data.apiKey ?? null,
    });
  }

  if (isSsrfUrl(url)) {
    return NextResponse.json(
      {
        success: false,
        error: "URL resolves to a private or restricted address",
      },
      { status: 400 }
    );
  }

  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error("Connection timed out after 10s")),
      10_000
    );
  });

  try {
    const result = await Promise.race([
      probe(url, headers, authProvider),
      timeout,
    ]);
    clearTimeout(timeoutId!);

    // Cache discovered tools on the server record
    if (serverId && result.tools.length > 0) {
      db.update(mcpServers)
        .set({ cachedTools: result.tools, toolsCachedAt: new Date() })
        .where(eq(mcpServers.id, serverId))
        .catch((e) =>
          console.warn(
            "[MCP] Failed to cache tools:",
            e instanceof Error ? e.message : e
          )
        );
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    clearTimeout(timeoutId!);
    const raw = error instanceof Error ? error.message : "";
    console.error("[MCP Test] Connection failed:", raw || "Unknown error");
    // Don't leak raw error messages (may contain URLs with embedded API keys)
    const message = raw.includes("timed out")
      ? "Connection timed out"
      : raw.includes("SSRF") || raw.includes("private")
        ? "URL resolves to a private address"
        : "Connection failed";
    return NextResponse.json({ success: false, error: message });
  }
}
