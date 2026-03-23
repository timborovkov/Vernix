import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { mcpServers } from "@/lib/db/schema";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const body = await request.json();

  const { name, url, apiKey, enabled } = body as Record<string, unknown>;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof name === "string" && name.length > 0) updates.name = name;
  if (typeof url === "string" && url.length > 0) updates.url = url;
  if (typeof apiKey === "string") updates.apiKey = apiKey || null;
  if (typeof enabled === "boolean") updates.enabled = enabled;

  const [updated] = await db
    .update(mcpServers)
    .set(updates)
    .where(and(eq(mcpServers.id, id), eq(mcpServers.userId, user.id)))
    .returning();

  if (!updated) {
    return NextResponse.json(
      { error: "MCP server not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const { id } = await params;

  const [deleted] = await db
    .delete(mcpServers)
    .where(and(eq(mcpServers.id, id), eq(mcpServers.userId, user.id)))
    .returning();

  if (!deleted) {
    return NextResponse.json(
      { error: "MCP server not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
