import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { mcpServers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// Accept either an existing server ID (apiKey looked up server-side)
// or a raw url+apiKey pair (for testing before saving)
const testSchema = z.union([
  z.object({ id: z.uuid() }),
  z.object({ url: z.url(), apiKey: z.string().optional() }),
]);

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

  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: { headers },
  });

  const client = new Client({ name: "KiviKova", version: "1.0.0" });
  await client.connect(transport);

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
