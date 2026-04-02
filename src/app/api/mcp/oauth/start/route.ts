import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { eq } from "drizzle-orm";
import { auth } from "@modelcontextprotocol/sdk/client/auth.js";
import { requireSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { mcpServers } from "@/lib/db/schema";
import { getIntegrations } from "@/lib/integrations/catalog";
import { VernixOAuthProvider } from "@/lib/mcp/oauth-provider";
import { requireLimits } from "@/lib/billing/enforce";
import { canAddMcpServer } from "@/lib/billing/limits";
import { getEnabledMcpServerCount } from "@/lib/billing/usage";

const startSchema = z.object({
  integrationId: z.string().min(1),
  serverUrl: z.string().url().optional(),
});

export async function POST(request: Request) {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = startSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  // Resolve server URL from catalog or request body
  let serverUrl: string;
  let integrationName: string;

  if (parsed.data.integrationId === "custom") {
    if (!parsed.data.serverUrl) {
      return NextResponse.json(
        { error: "serverUrl required for custom OAuth" },
        { status: 400 }
      );
    }
    serverUrl = parsed.data.serverUrl;
    integrationName = "Custom MCP Server";
  } else {
    const catalog = getIntegrations();
    const integration = catalog.find((i) => i.id === parsed.data.integrationId);
    if (!integration?.serverUrl) {
      return NextResponse.json(
        { error: "Integration not found or has no server URL" },
        { status: 404 }
      );
    }
    serverUrl = integration.serverUrl;
    integrationName = integration.name;
  }

  // Billing: enforce MCP server connection limit
  const { limits } = await requireLimits(user.id);
  const enabledCount = await getEnabledMcpServerCount(user.id);
  const mcpCheck = canAddMcpServer(limits, enabledCount);
  if (!mcpCheck.allowed) {
    return NextResponse.json({ error: mcpCheck.reason }, { status: 403 });
  }

  // Always create a new MCP server record to support multiple connections
  // (e.g. two Slack workspaces for different teams)
  const catalogId =
    parsed.data.integrationId === "custom" ? null : parsed.data.integrationId;
  const [created] = await db
    .insert(mcpServers)
    .values({
      userId: user.id,
      name: integrationName,
      url: serverUrl,
      authType: "oauth",
      catalogIntegrationId: catalogId,
      enabled: false, // enabled after OAuth callback succeeds
    })
    .returning({ id: mcpServers.id });
  const serverId = created.id;

  // Initiate OAuth flow via MCP SDK
  const provider = new VernixOAuthProvider(user.id, serverId, serverUrl);

  try {
    const result = await auth(provider, { serverUrl });

    if (result === "AUTHORIZED") {
      return NextResponse.json({ authorized: true, serverId });
    }

    // result === "REDIRECT" — provider.pendingAuthUrl has the authorization URL
    if (!provider.pendingAuthUrl) {
      // Clean up orphaned record
      await db
        .delete(mcpServers)
        .where(eq(mcpServers.id, serverId))
        .catch(() => {});
      return NextResponse.json(
        { error: "OAuth flow failed: no authorization URL generated" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      authorizationUrl: provider.pendingAuthUrl.toString(),
      serverId,
    });
  } catch (error) {
    // Clean up orphaned record on failure
    await db
      .delete(mcpServers)
      .where(eq(mcpServers.id, serverId))
      .catch(() => {});
    console.error("[OAuth Start] Failed:", error);
    const message =
      error instanceof Error ? error.message : "OAuth initialization failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
