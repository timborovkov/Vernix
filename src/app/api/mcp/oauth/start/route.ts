import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { and, eq } from "drizzle-orm";
import { auth } from "@modelcontextprotocol/sdk/client/auth.js";
import { requireSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { mcpServers } from "@/lib/db/schema";
import { getIntegrations } from "@/lib/integrations/catalog";
import { VernixOAuthProvider } from "@/lib/mcp/oauth-provider";

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

  // Find or create MCP server record
  // Include catalogIntegrationId in lookup so integrations sharing a URL
  // (e.g. Jira and Confluence both use mcp.atlassian.com) get separate records
  const catalogId =
    parsed.data.integrationId === "custom" ? null : parsed.data.integrationId;
  let serverId: string;
  const [existing] = await db
    .select({ id: mcpServers.id })
    .from(mcpServers)
    .where(
      and(
        eq(mcpServers.userId, user.id),
        eq(mcpServers.url, serverUrl),
        eq(mcpServers.authType, "oauth"),
        catalogId ? eq(mcpServers.catalogIntegrationId, catalogId) : undefined
      )
    );

  if (existing) {
    serverId = existing.id;
  } else {
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
    serverId = created.id;
  }

  // Initiate OAuth flow via MCP SDK
  const provider = new VernixOAuthProvider(user.id, serverId, serverUrl);

  try {
    const result = await auth(provider, { serverUrl });

    if (result === "AUTHORIZED") {
      return NextResponse.json({ authorized: true, serverId });
    }

    // result === "REDIRECT" — provider.pendingAuthUrl has the authorization URL
    if (!provider.pendingAuthUrl) {
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
    console.error("[OAuth Start] Failed:", error);
    const message =
      error instanceof Error ? error.message : "OAuth initialization failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
