import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { mcpServers } from "@/lib/db/schema";
import { invalidateMcpCache } from "@/lib/mcp/client";
import { isSsrfUrl } from "@/lib/mcp/transport";
import { requireLimits } from "@/lib/billing/enforce";
import { canAddMcpServer } from "@/lib/billing/limits";
import { getEnabledMcpServerCount } from "@/lib/billing/usage";

const authKeyParamPattern = /^[a-zA-Z0-9_-]+$/;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const body = await request.json();

  const {
    name,
    url,
    apiKey,
    enabled,
    authType,
    authHeaderName,
    authHeaderValue,
    authKeyParam,
    authUsername,
    authPassword,
  } = body as Record<string, unknown>;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof name === "string" && name.length > 0) updates.name = name;
  if (typeof url === "string" && url.length > 0) {
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
    if (isSsrfUrl(url)) {
      return NextResponse.json(
        { error: "URL resolves to a private or restricted address" },
        { status: 400 }
      );
    }
    updates.url = url;
  }
  if (typeof apiKey === "string") updates.apiKey = apiKey || null;
  if (typeof enabled === "boolean") {
    if (enabled) {
      // Only check billing when transitioning from disabled to enabled.
      // Fetch current state to avoid blocking updates on already-enabled servers.
      const [current] = await db
        .select({ enabled: mcpServers.enabled })
        .from(mcpServers)
        .where(and(eq(mcpServers.id, id), eq(mcpServers.userId, user.id)));
      if (current && !current.enabled) {
        const { limits } = await requireLimits(user.id);
        const enabledCount = await getEnabledMcpServerCount(user.id);
        const mcpCheck = canAddMcpServer(limits, enabledCount);
        if (!mcpCheck.allowed) {
          return NextResponse.json(
            { error: mcpCheck.reason, code: "BILLING_LIMIT" },
            { status: 403 }
          );
        }
      }
    }
    updates.enabled = enabled;
  }
  const validAuthTypes = [
    "none",
    "bearer",
    "header",
    "basic",
    "oauth",
    "url_key",
  ];
  if (typeof authType === "string" && validAuthTypes.includes(authType))
    updates.authType = authType;
  if (typeof authHeaderName === "string")
    updates.authHeaderName = authHeaderName || null;
  if (typeof authHeaderValue === "string")
    updates.authHeaderValue = authHeaderValue || null;
  if (typeof authKeyParam === "string") {
    if (
      authKeyParam.length > 0 &&
      (authKeyParam.length > 50 || !authKeyParamPattern.test(authKeyParam))
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid authKeyParam. Use only letters, numbers, underscores, and hyphens (max 50 chars).",
        },
        { status: 400 }
      );
    }
    updates.authKeyParam = authKeyParam || null;
  }
  if (typeof authUsername === "string")
    updates.authUsername = authUsername || null;
  if (typeof authPassword === "string")
    updates.authPassword = authPassword || null;

  const [updated] = await db
    .update(mcpServers)
    .set(updates)
    .where(and(eq(mcpServers.id, id), eq(mcpServers.userId, user.id)))
    .returning({
      id: mcpServers.id,
      name: mcpServers.name,
      url: mcpServers.url,
      authType: mcpServers.authType,
      enabled: mcpServers.enabled,
      createdAt: mcpServers.createdAt,
      updatedAt: mcpServers.updatedAt,
    });

  if (!updated) {
    return NextResponse.json(
      { error: "MCP server not found" },
      { status: 404 }
    );
  }

  invalidateMcpCache(user.id);
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

  invalidateMcpCache(user.id);
  return NextResponse.json({ success: true });
}
