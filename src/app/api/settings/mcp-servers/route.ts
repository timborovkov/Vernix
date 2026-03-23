import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { requireSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { mcpServers } from "@/lib/db/schema";
import { invalidateMcpCache } from "@/lib/mcp/client";

const createServerSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.url(),
  apiKey: z.string().optional(),
});

export async function GET() {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const servers = await db
    .select({
      id: mcpServers.id,
      name: mcpServers.name,
      url: mcpServers.url,
      enabled: mcpServers.enabled,
      createdAt: mcpServers.createdAt,
      updatedAt: mcpServers.updatedAt,
    })
    .from(mcpServers)
    .where(eq(mcpServers.userId, user.id))
    .orderBy(desc(mcpServers.createdAt));

  return NextResponse.json({ servers });
}

export async function POST(request: Request) {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const body = await request.json();
  const parsed = createServerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const [server] = await db
    .insert(mcpServers)
    .values({
      userId: user.id,
      name: parsed.data.name,
      url: parsed.data.url,
      apiKey: parsed.data.apiKey ?? null,
    })
    .returning({
      id: mcpServers.id,
      name: mcpServers.name,
      url: mcpServers.url,
      enabled: mcpServers.enabled,
      createdAt: mcpServers.createdAt,
      updatedAt: mcpServers.updatedAt,
    });

  invalidateMcpCache(user.id);

  return NextResponse.json(server, { status: 201 });
}
