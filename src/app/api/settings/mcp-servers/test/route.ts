import { NextResponse } from "next/server";
import { z } from "zod/v4";
import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import { requireSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { mcpServers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { connectMcpClient, isSsrfUrl } from "@/lib/mcp/transport";
import { buildAuthHeaders } from "@/lib/mcp/auth";
import { VernixOAuthProvider } from "@/lib/mcp/oauth-provider";

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

async function probe(
  url: string,
  headers: Record<string, string>,
  authProvider?: OAuthClientProvider
): Promise<{
  toolCount: number;
  tools: { name: string; description: string }[];
}> {
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

    url = server.url;
    // url_key: embed API key as query param
    if (server.authType === "url_key" && server.authHeaderValue) {
      const u = new URL(server.url);
      u.searchParams.set(
        server.authKeyParam ?? "apiKey",
        server.authHeaderValue
      );
      url = u.toString();
    }
    headers = buildAuthHeaders(server);
    if (server.authType === "oauth") {
      authProvider = new VernixOAuthProvider(user.id, server.id, server.url);
    }
  } else {
    url = parsed.data.url;
    // url_key: embed API key as query param
    if (parsed.data.authType === "url_key" && parsed.data.authHeaderValue) {
      const u = new URL(parsed.data.url);
      u.searchParams.set(
        parsed.data.authKeyParam ?? "apiKey",
        parsed.data.authHeaderValue
      );
      url = u.toString();
    }
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
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    clearTimeout(timeoutId!);
    const message =
      error instanceof Error ? error.message : "Connection failed";
    return NextResponse.json({ success: false, error: message });
  }
}
