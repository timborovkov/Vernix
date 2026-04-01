import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { getIntegrations } from "@/lib/integrations/catalog";

/**
 * Diagnostic endpoint for OAuth configuration.
 * Checks env vars, fetches server metadata, and validates redirect URIs.
 * Only available to authenticated users.
 *
 * GET /api/mcp/oauth/diagnose?integrationId=notion
 */
export async function GET(request: Request) {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(request.url);
  const integrationId = searchParams.get("integrationId");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUrl = `${appUrl}/api/mcp/oauth/callback`;

  const catalog = getIntegrations();
  const oauthIntegrations = catalog.filter((i) => i.authMode === "oauth");

  // If specific integration requested, diagnose just that one
  const targets = integrationId
    ? oauthIntegrations.filter((i) => i.id === integrationId)
    : oauthIntegrations;

  if (targets.length === 0) {
    return NextResponse.json(
      { error: `No OAuth integration found: ${integrationId}` },
      { status: 404 }
    );
  }

  // GitHub, Slack, and Pipedrive need pre-registered credentials.
  // Notion, Linear, and others use RFC 7591 dynamic client registration.
  const PRE_REGISTERED_ENV_MAP: Record<
    string,
    { clientIdEnv: string; clientSecretEnv: string }
  > = {
    "https://api.githubcopilot.com": {
      clientIdEnv: "GITHUB_MCP_CLIENT_ID",
      clientSecretEnv: "GITHUB_MCP_CLIENT_SECRET",
    },
    "https://mcp.pipedrive.com": {
      clientIdEnv: "PIPEDRIVE_MCP_CLIENT_ID",
      clientSecretEnv: "PIPEDRIVE_MCP_CLIENT_SECRET",
    },
    "https://mcp.slack.com": {
      clientIdEnv: "SLACK_MCP_CLIENT_ID",
      clientSecretEnv: "SLACK_MCP_CLIENT_SECRET",
    },
  };

  const results = await Promise.all(
    targets.map(async (integration) => {
      const serverUrl = integration.serverUrl;
      if (!serverUrl) {
        return {
          id: integration.id,
          name: integration.name,
          error: "No serverUrl",
        };
      }

      // Check env vars (only for pre-registered providers)
      const envConfig = Object.entries(PRE_REGISTERED_ENV_MAP).find(
        ([prefix]) => serverUrl.startsWith(prefix)
      )?.[1];

      const clientId = envConfig
        ? process.env[envConfig.clientIdEnv]
        : undefined;
      const clientSecret = envConfig
        ? process.env[envConfig.clientSecretEnv]
        : undefined;
      const usesDynamicRegistration = !envConfig;

      // Fetch OAuth metadata
      let metadata: Record<string, unknown> | null = null;
      let metadataError: string | null = null;
      try {
        const origin = new URL(serverUrl).origin;
        const res = await fetch(
          `${origin}/.well-known/oauth-authorization-server`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (res.ok) {
          metadata = (await res.json()) as Record<string, unknown>;
        } else {
          metadataError = `HTTP ${res.status}`;
        }
      } catch (e) {
        metadataError = e instanceof Error ? e.message : String(e);
      }

      // Fetch resource metadata (RFC 9728)
      let resourceMetadata: Record<string, unknown> | null = null;
      try {
        const res = await fetch(
          `${serverUrl.replace(/\/$/, "")}/.well-known/oauth-protected-resource`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (res.ok) {
          resourceMetadata = (await res.json()) as Record<string, unknown>;
        }
      } catch {
        // Not all servers support RFC 9728
      }

      return {
        id: integration.id,
        name: integration.name,
        serverUrl,
        redirectUrl,
        authStrategy: usesDynamicRegistration
          ? "dynamic-registration (RFC 7591)"
          : "pre-registered",
        credentials: usesDynamicRegistration
          ? { note: "Uses dynamic client registration — no env vars needed" }
          : {
              clientIdEnv: envConfig?.clientIdEnv,
              clientSecretEnv: envConfig?.clientSecretEnv,
              hasClientId: !!clientId,
              clientIdPrefix: clientId ? clientId.slice(0, 8) + "…" : null,
              hasClientSecret: !!clientSecret,
            },
        serverMetadata: metadata
          ? {
              issuer: metadata.issuer,
              authorization_endpoint: metadata.authorization_endpoint,
              token_endpoint: metadata.token_endpoint,
              registration_endpoint: metadata.registration_endpoint,
              token_endpoint_auth_methods_supported:
                metadata.token_endpoint_auth_methods_supported,
              code_challenge_methods_supported:
                metadata.code_challenge_methods_supported,
              grant_types_supported: metadata.grant_types_supported,
            }
          : { error: metadataError },
        resourceMetadata: resourceMetadata
          ? {
              resource: resourceMetadata.resource,
              authorization_servers: resourceMetadata.authorization_servers,
              scopes_supported: resourceMetadata.scopes_supported,
            }
          : null,
      };
    })
  );

  return NextResponse.json({ redirectUrl, integrations: results });
}
