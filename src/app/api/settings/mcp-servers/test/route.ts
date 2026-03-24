import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { mcpServers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { connectMcpClient } from "@/lib/mcp/transport";

// Accept either an existing server ID (apiKey looked up server-side)
// or a raw url+apiKey pair (for testing before saving)
const testSchema = z.union([
  z.object({ id: z.uuid() }),
  z.object({ url: z.url(), apiKey: z.string().optional() }),
]);

// Reject private/loopback/link-local IPs to prevent SSRF.
// Covers: loopback (127.x, ::1), private ranges (10.x, 172.16-31.x, 192.168.x),
// link-local incl. cloud metadata endpoint (169.254.x.x), unspecified (0.0.0.0),
// IPv6 ULA (fc00::/7), and .local mDNS hostnames.
const PRIVATE_IP_RE =
  /^(localhost|.*\.local|0\.0\.0\.0|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+|127\.\d+\.\d+\.\d+|::1|fc[0-9a-f]{2}:|fd[0-9a-f]{2}:)/i;

function isSsrfUrl(rawUrl: string): boolean {
  try {
    const { hostname } = new URL(rawUrl);
    return PRIVATE_IP_RE.test(hostname);
  } catch {
    return true;
  }
}

async function probe(
  url: string,
  apiKey?: string | null
): Promise<{
  toolCount: number;
  tools: { name: string; description: string }[];
}> {
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const client = new Client({ name: "KiviKova", version: "1.0.0" });
  await connectMcpClient(client, url, headers);

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
  let apiKey: string | null | undefined;

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
    apiKey = server.apiKey;
  } else {
    url = parsed.data.url;
    apiKey = parsed.data.apiKey;
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
    const result = await Promise.race([probe(url, apiKey), timeout]);
    clearTimeout(timeoutId!);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    clearTimeout(timeoutId!);
    const message =
      error instanceof Error ? error.message : "Connection failed";
    return NextResponse.json({ success: false, error: message });
  }
}
