import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { requireSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { mcpServers } from "@/lib/db/schema";
import { invalidateMcpCache } from "@/lib/mcp/client";

const authTypeEnum = z.enum(["none", "bearer", "header", "basic", "oauth"]);

const createServerSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.url(),
  authType: authTypeEnum.default("none"),
  authHeaderName: z.string().optional(),
  authHeaderValue: z.string().optional(),
  authUsername: z.string().optional(),
  authPassword: z.string().optional(),
  catalogIntegrationId: z.string().optional(),
  // Legacy support
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
      authType: mcpServers.authType,
      catalogIntegrationId: mcpServers.catalogIntegrationId,
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

  // Legacy: if apiKey is provided without authType, treat as bearer
  let authType = parsed.data.authType;
  let authHeaderValue = parsed.data.authHeaderValue;
  if (parsed.data.apiKey && authType === "none") {
    authType = "bearer";
    authHeaderValue = parsed.data.apiKey;
  }

  const [server] = await db
    .insert(mcpServers)
    .values({
      userId: user.id,
      name: parsed.data.name,
      url: parsed.data.url,
      apiKey: parsed.data.apiKey ?? null, // legacy column
      authType,
      authHeaderName: parsed.data.authHeaderName ?? null,
      authHeaderValue: authHeaderValue ?? null,
      authUsername: parsed.data.authUsername ?? null,
      authPassword: parsed.data.authPassword ?? null,
      catalogIntegrationId: parsed.data.catalogIntegrationId ?? null,
    })
    .returning({
      id: mcpServers.id,
      name: mcpServers.name,
      url: mcpServers.url,
      authType: mcpServers.authType,
      catalogIntegrationId: mcpServers.catalogIntegrationId,
      enabled: mcpServers.enabled,
      createdAt: mcpServers.createdAt,
      updatedAt: mcpServers.updatedAt,
    });

  invalidateMcpCache(user.id);

  return NextResponse.json(server, { status: 201 });
}
