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
- `authMode` (api_key, token, oauth, none)
- `status` (available, coming-soon)
- `examplePrompts` and `sampleResponses` for marketing display
- `docsUrl` and `setupInstructions` for connect flow

### Loader functions

```ts
getIntegrations(); // All catalog entries
getIntegration(id); // Single entry by ID
getFeaturedIntegrations(); // Featured entries for hero sections
getIntegrationsByCategory(cat); // Filter by category
getAvailableIntegrations(); // Only status === "available"
```

The loader interface is stable so the source can migrate from code to DB/admin tooling later.

### Current catalog

| Integration     | Category           | Auth    | Status      |
| --------------- | ------------------ | ------- | ----------- |
| Slack           | communication      | token   | available   |
| Linear          | project-management | api_key | available   |
| GitHub          | dev-tools          | token   | available   |
| Notion          | productivity       | token   | available   |
| Jira            | project-management | api_key | available   |
| Google Calendar | productivity       | oauth   | coming-soon |
| HubSpot         | crm                | api_key | coming-soon |
| Salesforce      | crm                | oauth   | coming-soon |

---

## MCP Client (outbound connections)

### Connection management

`src/lib/mcp/client.ts` — `McpClientManager` class:

- Singleton per user with 5-min cache TTL
- Connects to all enabled servers in parallel (10s timeout per server)
- Discovers tools via `listTools()`, namespaces as `mcp__[serverId]__[toolName]`
- Graceful degradation on connection failure
- Cache invalidated on server CRUD operations

### Transport layer

`src/lib/mcp/transport.ts`:

- SSRF protection (blocks private IPs, .local hostnames)
- Protocol negotiation: tries Streamable HTTP first, falls back to SSE
- Bearer token auth from server config

### Data model

`mcpServers` table in `src/lib/db/schema.ts`:

```
id, userId, name, url, apiKey (optional), enabled (boolean), createdAt, updatedAt
```

### Connect flow

1. User picks integration from catalog (or enters custom URL)
2. Frontend calls `POST /api/settings/mcp-servers` with name, URL, optional API key
3. Server creates DB record, invalidates MCP cache
4. Test connection via `POST /api/settings/mcp-servers/test`
5. Agent automatically uses connected tools in next meeting

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

- Featured integrations section
- Searchable catalog grid with category filters
- Connected integrations shown at top with green badge
- Connect dialog with pre-filled URLs and setup instructions
- "Connect any MCP server" section for custom servers
- Billing gate: Free users see catalog but "Connect" shows upgrade dialog

### Settings

- "MCP Server Access" card remains (API keys for Vernix's outbound server)
- "Integrations" link redirects to `/dashboard/integrations`

---

## Billing gates

| Feature                  | Free | Trial | Pro   |
| ------------------------ | ---- | ----- | ----- |
| View integration catalog | Yes  | Yes   | Yes   |
| Connect integrations     | No   | No    | Yes   |
| Use Vernix MCP server    | No   | No    | Yes   |
| API requests/day         | 0    | 0     | 1,000 |
| Max MCP connections      | 0    | 0     | 10    |

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

Stored in `public/integrations/{id}.svg`. Sourced from Simple Icons. Use `dark:invert` CSS for dark mode compatibility.
