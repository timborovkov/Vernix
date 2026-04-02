import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { requireSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { mcpServers } from "@/lib/db/schema";
import { invalidateMcpCache } from "@/lib/mcp/client";
import { isSsrfUrl } from "@/lib/mcp/transport";
import { requireLimits } from "@/lib/billing/enforce";
import { canAddMcpServer } from "@/lib/billing/limits";
import { getEnabledMcpServerCount } from "@/lib/billing/usage";

const authTypeEnum = z.enum([
  "none",
  "bearer",
  "header",
  "basic",
  "oauth",
  "url_key",
]);

const createServerSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.url(),
  authType: authTypeEnum.default("none"),
  authHeaderName: z.string().optional(),
  authHeaderValue: z.string().optional(),
  authKeyParam: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/)
    .max(50)
    .optional(),
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
      disabledTools: mcpServers.disabledTools,
      cachedTools: mcpServers.cachedTools,
      toolsCachedAt: mcpServers.toolsCachedAt,
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

  if (isSsrfUrl(parsed.data.url)) {
    return NextResponse.json(
      { error: "URL resolves to a private or restricted address" },
      { status: 400 }
    );
  }

  // Billing: enforce MCP server connection limit
  const { limits } = await requireLimits(user.id);
  const enabledCount = await getEnabledMcpServerCount(user.id);
  const mcpCheck = canAddMcpServer(limits, enabledCount);
  if (!mcpCheck.allowed) {
    return NextResponse.json({ error: mcpCheck.reason }, { status: 403 });
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
      authKeyParam: parsed.data.authKeyParam ?? null,
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
