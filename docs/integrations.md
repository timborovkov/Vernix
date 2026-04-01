# Integrations Architecture

> How Vernix connects to external tools via MCP (Model Context Protocol).

---

## Overview

Vernix uses MCP as the protocol layer for all tool integrations. Users connect external MCP servers (Slack, Linear, GitHub, etc.) that provide tools the AI agent can call during meetings. Vernix also exposes its own MCP server so external AI tools (Claude Desktop, Cursor) can query meeting data.

### Two directions

1. **Inbound (Vernix as MCP server):** External tools call Vernix to search meetings, list tasks, get transcripts. Endpoint: `/api/mcp`, auth via API key.
2. **Outbound (Vernix as MCP client):** Vernix connects to user-configured external MCP servers, discovers their tools, and calls them during meetings when the agent needs data.

---

## Integration Catalog

### Source of truth

`src/lib/integrations/catalog.ts` defines all known integrations with metadata:

- `id`, `name`, `description`, `logo` (SVG in `public/integrations/`)
- `category` (communication, project-management, dev-tools, crm, productivity)
- `authMode` (api_key, token, oauth, none, url_key)
- `serverUrl` (pre-filled URL for hosted MCP endpoints, null if user-provided)
- `status` (available, coming-soon)
- `examplePrompts` and `sampleResponses` for marketing display
- `docsUrl` and `setupInstructions` for connect flow

### Loader functions

```ts
getIntegrations(); // All catalog entries
getFeaturedIntegrations(); // Featured entries for hero/logo cloud
```

---

## MCP Auth Types

`src/lib/mcp/auth.ts` — `buildAuthHeaders()` builds HTTP headers based on the server's `authType`:

| authType | Headers                            | Use Case                            |
| -------- | ---------------------------------- | ----------------------------------- |
| `none`   | `{}`                               | No auth required                    |
| `bearer` | `Authorization: Bearer {token}`    | API tokens, access tokens           |
| `header` | `{headerName}: {headerValue}`      | Custom header (e.g. `X-API-Key`)    |
| `basic`  | `Authorization: Basic {base64}`    | HTTP basic auth (username:password) |
| `oauth`  | `{}` (handled by SDK authProvider) | OAuth 2.1 via MCP SDK               |

Legacy: if the old `apiKey` field is set but `authType` is still `none`, it's treated as `bearer`.

---

## OAuth Flow

For catalog integrations with `authMode: "oauth"`, Vernix uses the MCP SDK's built-in OAuth 2.1 support.

### OAuth auth strategies

OAuth integrations use two strategies depending on provider support:

**Dynamic registration (RFC 7591)** — No env vars needed. The MCP SDK automatically registers Vernix as a public client with the provider's `/register` endpoint. Client credentials are persisted in `mcpOauthTokens`.

| Service    | Auth Strategy        | Token Endpoint Auth |
| ---------- | -------------------- | ------------------- |
| Notion     | Dynamic registration | `none` (public)     |
| Linear     | Dynamic registration | `none` (public)     |
| Atlassian  | Dynamic registration | `none` (public)     |
| Asana      | Dynamic registration | `none` (public)     |
| Figma      | Dynamic registration | `none` (public)     |
| GitLab     | Dynamic registration | server-assigned     |
| Intercom   | Dynamic registration | `none` (public)     |
| Monday.com | Dynamic registration | `none` (public)     |
| Sentry     | Dynamic registration | `none` (public)     |

**Pre-registered** — Requires env vars. For providers that don't expose a registration endpoint.

| Service   | Env Vars                                                 | Token Endpoint Auth  |
| --------- | -------------------------------------------------------- | -------------------- |
| GitHub    | `GITHUB_MCP_CLIENT_ID`, `GITHUB_MCP_CLIENT_SECRET`       | `none`               |
| Pipedrive | `PIPEDRIVE_MCP_CLIENT_ID`, `PIPEDRIVE_MCP_CLIENT_SECRET` | `client_secret_post` |
| Slack     | `SLACK_MCP_CLIENT_ID`, `SLACK_MCP_CLIENT_SECRET`         | `client_secret_post` |

MCP OAuth apps are separate from login OAuth apps — different redirect URLs. Login uses providers like `GITHUB_CLIENT_ID` → `/api/auth/callback/github`. MCP integrations use `/api/mcp/oauth/callback`.

### Adding a new OAuth integration

**If the provider supports dynamic registration** (has a `registration_endpoint` in its `.well-known/oauth-authorization-server` metadata):

1. Add the integration to the catalog in `src/lib/integrations/catalog.ts` with `authMode: "oauth"`
2. No env vars or code changes needed — the MCP SDK handles registration automatically

**If the provider does NOT support dynamic registration:**

1. Register Vernix as an OAuth app on the service's developer console
2. Set the callback URL to `https://vernix.app/api/mcp/oauth/callback`
3. Add env vars for the client ID and secret
4. Add an entry to `PRE_REGISTERED_CLIENTS` in `src/lib/mcp/oauth-provider.ts`
5. Add the integration to the catalog
6. Add the env vars to `.env.example` and `src/lib/env.ts`

### How the flow works

1. User clicks Connect on a catalog integration (e.g. GitHub)
2. Frontend calls `POST /api/mcp/oauth/start` with `{ integrationId: "github" }`
3. Backend creates `mcpServers` row with `authType: "oauth"`, `enabled: false`
4. `VernixOAuthProvider` is created, returns pre-registered `client_id` from env vars
5. MCP SDK's `auth()` discovers OAuth metadata, generates PKCE, builds auth URL
6. Provider stores the auth URL (doesn't redirect server-side), returns it to frontend
7. Frontend redirects browser to the auth URL
8. User authorizes on the external service
9. Service redirects to `GET /api/mcp/oauth/callback?code=xxx&state=yyy`
10. Backend verifies the state JWT, exchanges the code for tokens via SDK
11. Tokens persisted to `mcpOauthTokens`, server `enabled` set to `true`
12. Redirect to `/dashboard/integrations?connected=github`

### Token management

At runtime, `McpClientManager.connectToServer()` creates a `VernixOAuthProvider` for OAuth servers and passes it to the transport. The MCP SDK handles token injection, refresh, and 401 retry automatically.

If tokens expire and refresh fails, the server is skipped with a warning — user needs to re-authorize via the UI.

### State parameter security

The OAuth `state` parameter is a JWT signed with `AUTH_SECRET` containing `{ userId, mcpServerId }` with 15-minute expiry. Verified in the callback route to prevent CSRF.

### DB tables

**`mcpServers`** — extended with auth fields:

```
id, userId, name, url,
apiKey (legacy),
authType (none|bearer|header|basic|oauth),
authHeaderName, authHeaderValue,
authUsername, authPassword,
catalogIntegrationId,
enabled, createdAt, updatedAt
```

**`mcpOauthTokens`** — OAuth token storage:

```
id, userId, mcpServerId,
accessToken, refreshToken, tokenType, scope, expiresAt,
clientId, clientSecret (from dynamic registration),
codeVerifier (PKCE, temporary during flow),
createdAt, updatedAt
```

---

## MCP Client (outbound connections)

### Connection management

`src/lib/mcp/client.ts` — `McpClientManager` class:

- Singleton per user with 5-min cache TTL
- Connects to all enabled servers in parallel (10s timeout per server)
- Discovers tools via `listTools()`, namespaces as `mcp__[serverId]__[toolName]`
- OAuth servers use `VernixOAuthProvider` as `authProvider` on the transport
- Non-OAuth servers use `buildAuthHeaders()` for raw header injection
- Graceful degradation: `UnauthorizedError` from OAuth servers is logged, server skipped
- Cache invalidated on server CRUD operations and OAuth callback

### Transport layer

`src/lib/mcp/transport.ts`:

- SSRF protection (blocks private IPs, .local hostnames)
- Protocol negotiation: tries Streamable HTTP first, falls back to SSE
- Optional `authProvider` param for OAuth 2.1 (passed to both transports)

---

## MCP Server (inbound connections)

### Exposed tools

`src/lib/mcp/server.ts` creates a user-scoped MCP server with:

1. `search_meetings` — Vector RAG search across transcripts
2. `list_meetings` — Filter by status
3. `get_meeting` — Meeting details + metadata
4. `get_transcript` — Full transcript with speakers
5. `list_tasks` — Filter by meeting/status
6. `create_task` — Create action items

### Endpoint

`/api/mcp` — Streamable HTTP transport, API key auth, session management (30-min TTL).

---

## Dashboard UI

### `/dashboard/integrations`

- "Connect any MCP server" section with custom auth type selector (none, bearer, header, basic)
- Searchable catalog grid with category filters
- Expandable cards with example prompts and docs links
- Connected integrations shown at top with green badge (matched by `catalogIntegrationId`)
- OAuth integrations: "Connect with {name}" button triggers redirect flow
- Token integrations: paste token in dialog
- Billing gate: Free users see catalog but "Connect" shows upgrade dialog

### Connect dialog behavior

- **OAuth catalog integrations**: "Connect with {name}" button, no form fields, redirects to external OAuth
- **Token catalog integrations** (e.g. Airtable): pre-filled URL, token input
- **Custom servers**: URL input + auth type selector (None / Bearer / Custom Header / HTTP Basic)

---

## Billing gates

| Feature                  | Free | Trial | Pro   |
| ------------------------ | ---- | ----- | ----- |
| View integration catalog | Yes  | Yes   | Yes   |
| Connect integrations     | No   | Yes   | Yes   |
| Use Vernix MCP server    | No   | Yes   | Yes   |
| API requests/day         | 0    | 1,000 | 1,000 |
| MCP server connections   | 0    | Yes   | Yes   |
| MCP client connections   | 0    | Yes   | Yes   |

---

## Marketing surfaces

### Integration Cloud component

`src/components/integration-cloud.tsx` — Reusable component rendered from catalog data:

- Featured integration logos
- Example prompts users can ask
- "Thousands more through MCP" extensibility message
- CTA button

Used on: landing page, `/features/integrations` page.

### Logos

Stored in `public/integrations/{id}.svg`. Sourced from Simple Icons and official brand assets.

---

## Network Tests

`src/lib/integrations/catalog.network.test.ts` — verifies all catalog MCP server endpoints are reachable.

Run with: `pnpm test:network`

Tests send an MCP `initialize` request to each available server URL. Reachability accepts statuses proving the endpoint exists (e.g. 200, 401/403, 405, and redirect responses). OAuth integrations are additionally validated for auth-gated behavior (redirect or auth challenge). The suite also validates structural invariants (all available integrations have URLs, all URLs are HTTPS, no unexpected duplicates).
