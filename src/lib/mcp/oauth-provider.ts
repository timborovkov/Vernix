import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import type {
  OAuthClientMetadata,
  OAuthClientInformation,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/lib/db";
import { mcpOauthTokens } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getEnv } from "@/lib/env";

/**
 * Pre-registered OAuth app credentials for services that do NOT support
 * dynamic client registration (RFC 7591). Keyed by server URL prefix.
 *
 * Services that DO support dynamic registration (Notion, Linear, GitHub)
 * should NOT be listed here — the MCP SDK will register automatically
 * via POST /register and persist the client_id in mcpOauthTokens.
 */
const PRE_REGISTERED_CLIENTS: Record<
  string,
  {
    clientIdEnv: string;
    clientSecretEnv: string;
    tokenEndpointAuthMethod: OAuthClientMetadata["token_endpoint_auth_method"];
  }
> = {
  "https://api.githubcopilot.com": {
    clientIdEnv: "GITHUB_MCP_CLIENT_ID",
    clientSecretEnv: "GITHUB_MCP_CLIENT_SECRET",
    tokenEndpointAuthMethod: "none",
  },
  "https://mcp.pipedrive.com": {
    clientIdEnv: "PIPEDRIVE_MCP_CLIENT_ID",
    clientSecretEnv: "PIPEDRIVE_MCP_CLIENT_SECRET",
    tokenEndpointAuthMethod: "client_secret_post",
  },
  "https://mcp.slack.com": {
    clientIdEnv: "SLACK_MCP_CLIENT_ID",
    clientSecretEnv: "SLACK_MCP_CLIENT_SECRET",
    tokenEndpointAuthMethod: "client_secret_post",
  },
};

export function getPreRegisteredConfig(serverUrl: string):
  | {
      clientIdEnv: string;
      clientSecretEnv: string;
      tokenEndpointAuthMethod: OAuthClientMetadata["token_endpoint_auth_method"];
    }
  | undefined {
  for (const [prefix, config] of Object.entries(PRE_REGISTERED_CLIENTS)) {
    if (serverUrl.startsWith(prefix)) return config;
  }
  return undefined;
}

function getPreRegisteredClient(
  serverUrl: string
): OAuthClientInformation | undefined {
  const config = getPreRegisteredConfig(serverUrl);
  if (!config) return undefined;

  const clientId = process.env[config.clientIdEnv];
  const clientSecret = process.env[config.clientSecretEnv];
  if (!clientId) return undefined;

  // Validate client_secret is present when the token endpoint auth method requires it
  if (config.tokenEndpointAuthMethod !== "none" && !clientSecret) {
    throw new Error(
      `Missing ${config.clientSecretEnv} — required for ${config.tokenEndpointAuthMethod} auth on ${serverUrl}`
    );
  }

  return {
    client_id: clientId,
    ...(clientSecret ? { client_secret: clientSecret } : {}),
  };
}

/**
 * Server-side OAuthClientProvider that persists state in the mcpOauthTokens table.
 *
 * For services with pre-registered OAuth apps (GitHub, etc.), returns credentials
 * from env vars. For services supporting dynamic registration, falls back to DB.
 *
 * Used in two contexts:
 * 1. OAuth start route — initiates auth, captures redirect URL
 * 2. MCP client manager — provides tokens for established connections
 */
export class VernixOAuthProvider implements OAuthClientProvider {
  /** Set by redirectToAuthorization(), read by the start route */
  pendingAuthUrl: URL | null = null;

  constructor(
    private userId: string,
    private mcpServerId: string,
    private serverUrl: string
  ) {}

  get redirectUrl(): string {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return `${appUrl}/api/mcp/oauth/callback`;
  }

  get clientMetadata(): OAuthClientMetadata {
    const tokenEndpointAuthMethod =
      getPreRegisteredConfig(this.serverUrl)?.tokenEndpointAuthMethod ?? "none";

    return {
      redirect_uris: [this.redirectUrl],
      client_name: "Vernix",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: tokenEndpointAuthMethod,
    };
  }

  /**
   * Generate a signed state parameter for CSRF protection.
   * Contains userId + mcpServerId so the callback can identify the session.
   */
  async state(): Promise<string> {
    const env = getEnv();
    const secret = new TextEncoder().encode(env.AUTH_SECRET);
    return new SignJWT({ userId: this.userId, mcpServerId: this.mcpServerId })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(secret);
  }

  async clientInformation(): Promise<OAuthClientInformation | undefined> {
    const preRegisteredConfig = getPreRegisteredConfig(this.serverUrl);

    // For pre-registered integrations, do not fall back to DB dynamic clients.
    // This prevents stale client IDs from being used when env vars are missing.
    if (preRegisteredConfig) {
      const preRegistered = getPreRegisteredClient(this.serverUrl);
      if (preRegistered) return preRegistered;

      throw new Error(
        `Missing pre-registered OAuth credentials for ${this.serverUrl}. Expected env vars: ${preRegisteredConfig.clientIdEnv} and ${preRegisteredConfig.clientSecretEnv}`
      );
    }

    // Fall back to dynamically registered credentials from DB
    const [row] = await db
      .select({
        clientId: mcpOauthTokens.clientId,
        clientSecret: mcpOauthTokens.clientSecret,
      })
      .from(mcpOauthTokens)
      .where(
        and(
          eq(mcpOauthTokens.userId, this.userId),
          eq(mcpOauthTokens.mcpServerId, this.mcpServerId)
        )
      );

    if (!row?.clientId) return undefined;

    return {
      client_id: row.clientId,
      ...(row.clientSecret ? { client_secret: row.clientSecret } : {}),
    };
  }

  async saveClientInformation(info: OAuthClientInformation): Promise<void> {
    // Skip saving if using pre-registered credentials from env vars
    if (getPreRegisteredConfig(this.serverUrl)) return;

    await this.upsertTokenRow({
      clientId: info.client_id,
      clientSecret:
        "client_secret" in info ? (info.client_secret as string) : null,
    });
  }

  async tokens(): Promise<OAuthTokens | undefined> {
    const [row] = await db
      .select({
        accessToken: mcpOauthTokens.accessToken,
        refreshToken: mcpOauthTokens.refreshToken,
        tokenType: mcpOauthTokens.tokenType,
        scope: mcpOauthTokens.scope,
        expiresAt: mcpOauthTokens.expiresAt,
      })
      .from(mcpOauthTokens)
      .where(
        and(
          eq(mcpOauthTokens.userId, this.userId),
          eq(mcpOauthTokens.mcpServerId, this.mcpServerId)
        )
      );

    if (!row?.accessToken) return undefined;

    const tokens: OAuthTokens = {
      access_token: row.accessToken,
      token_type: row.tokenType ?? "Bearer",
    };

    if (row.refreshToken) tokens.refresh_token = row.refreshToken;
    if (row.scope) tokens.scope = row.scope;
    if (row.expiresAt) {
      tokens.expires_in = Math.max(
        0,
        Math.floor((row.expiresAt.getTime() - Date.now()) / 1000)
      );
    }

    return tokens;
  }

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    await this.upsertTokenRow({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      tokenType: tokens.token_type ?? "Bearer",
      scope: tokens.scope ?? null,
      expiresAt,
    });
  }

  async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
    // Don't actually redirect — store the URL for the start route to return
    this.pendingAuthUrl = authorizationUrl;
  }

  async saveCodeVerifier(codeVerifier: string): Promise<void> {
    await this.upsertTokenRow({ codeVerifier });
  }

  async codeVerifier(): Promise<string> {
    const [row] = await db
      .select({ codeVerifier: mcpOauthTokens.codeVerifier })
      .from(mcpOauthTokens)
      .where(
        and(
          eq(mcpOauthTokens.userId, this.userId),
          eq(mcpOauthTokens.mcpServerId, this.mcpServerId)
        )
      );
    return row?.codeVerifier ?? "";
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async upsertTokenRow(
    fields: Partial<typeof mcpOauthTokens.$inferInsert>
  ): Promise<void> {
    const [existing] = await db
      .select({ id: mcpOauthTokens.id })
      .from(mcpOauthTokens)
      .where(
        and(
          eq(mcpOauthTokens.userId, this.userId),
          eq(mcpOauthTokens.mcpServerId, this.mcpServerId)
        )
      );

    if (existing) {
      await db
        .update(mcpOauthTokens)
        .set({ ...fields, updatedAt: new Date() })
        .where(eq(mcpOauthTokens.id, existing.id));
    } else {
      await db.insert(mcpOauthTokens).values({
        userId: this.userId,
        mcpServerId: this.mcpServerId,
        accessToken: "", // placeholder, will be updated by saveTokens
        ...fields,
      });
    }
  }
}

/**
 * Verify and decode a state JWT from the OAuth callback.
 */
export async function verifyOAuthState(
  state: string
): Promise<{ userId: string; mcpServerId: string }> {
  const env = getEnv();
  const secret = new TextEncoder().encode(env.AUTH_SECRET);
  const { payload } = await jwtVerify(state, secret);
  const userId = payload.userId as string;
  const mcpServerId = payload.mcpServerId as string;
  if (!userId || !mcpServerId) {
    throw new Error("Invalid OAuth state: missing userId or mcpServerId");
  }
  return { userId, mcpServerId };
}
