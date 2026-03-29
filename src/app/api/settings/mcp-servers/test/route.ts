import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { mcpServers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { connectMcpClient, isSsrfUrl } from "@/lib/mcp/transport";
import { buildAuthHeaders } from "@/lib/mcp/auth";

// Accept either an existing server ID or raw connection params for testing before saving
const testSchema = z.union([
  z.object({ id: z.uuid() }),
  z.object({
    url: z.url(),
    authType: z.enum(["none", "bearer", "header", "basic"]).default("none"),
    authHeaderName: z.string().optional(),
    authHeaderValue: z.string().optional(),
    authUsername: z.string().optional(),
    authPassword: z.string().optional(),
    // Legacy
    apiKey: z.string().optional(),
  }),
]);

async function probe(
  url: string,
  headers: Record<string, string>
): Promise<{
  toolCount: number;
  tools: { name: string; description: string }[];
}> {
  const client = await connectMcpClient(url, headers);

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
    headers = buildAuthHeaders(server);
  } else {
    url = parsed.data.url;
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
    const result = await Promise.race([probe(url, headers), timeout]);
    clearTimeout(timeoutId!);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    clearTimeout(timeoutId!);
    const message =
      error instanceof Error ? error.message : "Connection failed";
    return NextResponse.json({ success: false, error: message });
  }
}
