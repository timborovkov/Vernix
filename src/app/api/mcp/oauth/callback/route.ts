import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@modelcontextprotocol/sdk/client/auth.js";
import { db } from "@/lib/db";
import { mcpServers } from "@/lib/db/schema";
import {
  VernixOAuthProvider,
  verifyOAuthState,
} from "@/lib/mcp/oauth-provider";
import { invalidateMcpCache } from "@/lib/mcp/client";

/**
 * OAuth callback endpoint. Called by external services after user authorization.
 * Public — no session required. The state JWT provides authentication.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const integrationsUrl = `${appUrl}/dashboard/integrations`;

  // Handle user-denied or error from OAuth provider
  if (error) {
    console.error(
      `[OAuth Callback] Error from provider: ${error} — ${errorDescription}`
    );
    return NextResponse.redirect(
      `${integrationsUrl}?error=${encodeURIComponent(errorDescription ?? error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${integrationsUrl}?error=${encodeURIComponent("Missing authorization code or state")}`
    );
  }

  // Verify state JWT
  let userId: string;
  let mcpServerId: string;
  try {
    const decoded = await verifyOAuthState(state);
    userId = decoded.userId;
    mcpServerId = decoded.mcpServerId;
  } catch (err) {
    console.error("[OAuth Callback] Invalid state:", err);
    return NextResponse.redirect(
      `${integrationsUrl}?error=${encodeURIComponent("Invalid or expired authorization state")}`
    );
  }

  // Load server config
  const [server] = await db
    .select({
      url: mcpServers.url,
      catalogIntegrationId: mcpServers.catalogIntegrationId,
    })
    .from(mcpServers)
    .where(and(eq(mcpServers.id, mcpServerId), eq(mcpServers.userId, userId)));

  if (!server) {
    return NextResponse.redirect(
      `${integrationsUrl}?error=${encodeURIComponent("MCP server configuration not found")}`
    );
  }

  // Exchange authorization code for tokens
  const provider = new VernixOAuthProvider(userId, mcpServerId, server.url);

  try {
    const result = await auth(provider, {
      serverUrl: server.url,
      authorizationCode: code,
    });

    if (result !== "AUTHORIZED") {
      return NextResponse.redirect(
        `${integrationsUrl}?error=${encodeURIComponent("Token exchange failed")}`
      );
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[OAuth Callback] Token exchange failed:", {
      error: errMsg,
      serverUrl: server.url,
      catalogIntegrationId: server.catalogIntegrationId,
    });
    return NextResponse.redirect(
      `${integrationsUrl}?error=${encodeURIComponent(`Token exchange failed: ${errMsg}`)}`
    );
  }

  // Enable the server now that OAuth succeeded
  await db
    .update(mcpServers)
    .set({ enabled: true, updatedAt: new Date() })
    .where(and(eq(mcpServers.id, mcpServerId), eq(mcpServers.userId, userId)));

  // Invalidate MCP cache so the new tokens are used on next connection
  invalidateMcpCache(userId);

  // Redirect back to integrations page with success
  const connectedParam = server.catalogIntegrationId ?? "custom";
  return NextResponse.redirect(
    `${integrationsUrl}?connected=${encodeURIComponent(connectedParam)}`
  );
}
