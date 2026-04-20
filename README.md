# Vernix — AI Video Call Agent

AI that joins your video calls, creates embeddings from the meeting content, and acts as a voice or text agent participant with RAG capabilities.

**Supported platforms:** Zoom, Google Meet, Microsoft Teams, and Cisco Webex.

**[API Documentation](https://vernix.app/docs)**

## Tech Stack

- **Next.js 16** (App Router, Turbopack, TypeScript)
- **Shadcn/ui** + Tailwind CSS v4
- **Drizzle ORM** + PostgreSQL
- **Qdrant** for vector storage
- **OpenAI** for embeddings and voice
- **Recall.ai** for meeting bot integration
- **Vercel AI SDK** for streaming chat with tool calls
- **Minio / S3** for knowledge base file storage

## Quick Start

### Prerequisites

- Node.js 24+
- pnpm
- Docker

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env file and configure
cp .env.example .env.local

# 3. Start Postgres, Qdrant, and Minio
docker compose up -d

# 4. Push database schema
pnpm db:push

# 5. Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

## Environment Variables

See `.env.example` for all environment variables.

## Recall.ai Webhook Configuration

Two webhook endpoints, each serving a different purpose:

### 1. Realtime Transcripts — `/api/webhooks/recall/transcript` (automatic)

Configured per-bot in code when creating a bot via `POST /api/agent/join`. Recall streams live `transcript.data` events here during the call. No manual setup needed — just make sure `NEXT_PUBLIC_APP_URL` is set correctly.

### 2. Bot Status Events — `/api/webhooks/recall/status` (manual)

Go to **Recall Dashboard → Webhooks → Add Endpoint** and configure:

- **URL:** `https://your-app.up.railway.app/api/webhooks/recall/status`
- **Events:** `bot.call_ended`, `transcript.done`

`bot.call_ended` sets the meeting to "processing" status. `transcript.done` triggers summary generation after all transcript data has been delivered.

## Scripts

| Command          | Description                       |
| ---------------- | --------------------------------- |
| `pnpm dev`       | Start dev server                  |
| `pnpm build`     | Push DB schema + production build |
| `pnpm validate`  | Format, lint, typecheck, and test |
| `pnpm test`      | Run unit tests                    |
| `pnpm typecheck` | TypeScript type check             |
| `pnpm lint`      | Run ESLint                        |
| `pnpm format`    | Format with Prettier              |
| `pnpm db:push`   | Push schema to DB                 |
| `pnpm db:studio` | Open Drizzle Studio               |

## Architecture

- **Meetings** are stored in PostgreSQL with metadata (title, join link, status, participants, summary)
- Each meeting gets its own **Qdrant collection** for vector embeddings
- The **meeting bot** (Recall.ai) joins calls, streams audio, and generates transcripts
- Transcripts are embedded with OpenAI's `text-embedding-3-small` and stored in Qdrant
- After a meeting ends, an **LLM summary** is generated from all transcript segments
- The **RAG agent** searches current and past meeting transcripts to answer questions
- The **knowledge base** lets users upload PDF, DOCX, TXT, and MD files — parsed, chunked, embedded, and searchable alongside meeting transcripts via unified RAG. Documents can be scoped to specific meetings for context-aware boosting
- **Meeting agenda** field embedded into Qdrant for RAG, injected into agent prompts and summary generation
- **Action items** are auto-extracted from transcripts via LLM and stored as discrete tasks — viewable per-meeting and across all meetings on the dashboard
- **MCP Server** exposes meeting data (search, transcripts, tasks) to Claude Desktop, Cursor, and other MCP clients via API key auth
- **MCP Client** connects to user-configured external MCP servers, routing their tools to the chat and voice agents
- **Streaming chat** on meeting detail and dashboard pages with tool-call visualization and source citations
- The dashboard provides **meeting notes**, transcript timeline, search, and filtering
- **Silent Mode** — a per-meeting toggle that changes the agent from a voice participant to a passive text listener. The bot joins without audio or screen presence, monitors the live transcript server-side, and responds via the meeting's built-in chat when addressed by name (Vernix). Enable it in the "New Meeting" dialog or on the meeting detail page before the agent joins. Responses are rate-limited to 1 per 30 seconds to prevent chat spam.

## Agent Readiness

Vernix advertises its API surface to AI agents through several standard discovery conventions. These are all served by the Next.js app — no separate infra, no build-time steps, no extra cron jobs.

- **Link headers (RFC 8288)** on `/` and `/docs` advertise the api-catalog, OpenAPI spec, MCP endpoint, and llms.txt. See [`next.config.ts`](next.config.ts).
- **`/robots.txt`** emits `Content-Signal: ai-train=yes, search=yes, ai-input=yes` alongside the standard allow/disallow rules.
- **`/.well-known/api-catalog`** — RFC 9727 linkset pointing at the OpenAPI spec, docs, llms.txt, and the MCP server card.
- **`/.well-known/mcp/server-card.json`** — MCP Server Card (SEP-1649 draft) describing the server at `/api/mcp`, its transport, and auth model.
- **`/.well-known/agent-skills/index.json`** — Agent Skills Discovery v0.2.0 index with a live sha256 of `/llms.txt`.
- **`/llms.txt`** — hand-written markdown guide for LLMs covering pricing, API, MCP tools, and lifecycle. Regenerated from source data on every request.

### Markdown for Agents

Public pages respond to `Accept: text/markdown` with a markdown version of the page. Convention: the browser gets HTML, agents asking for markdown get markdown.

```bash
curl -H 'Accept: text/markdown' https://vernix.app/pricing
curl -H 'Accept: text/markdown' https://vernix.app/docs   # rendered from OpenAPI, not HTML
```

**How it works:** [`src/middleware.ts`](src/middleware.ts) intercepts requests carrying `Accept: text/markdown` and rewrites them to [`/api/agent-md?path=<original-path>`](src/app/api/agent-md/route.ts). That route fetches the HTML version from our own origin, strips nav/footer/scripts, and converts to markdown via `node-html-markdown`. Results are cached in-process for 1h per path (200-entry LRU cap).

`/docs` is special-cased: it renders markdown directly from the OpenAPI spec via [`src/lib/api/openapi-md.ts`](src/lib/api/openapi-md.ts) because Scalar's client-rendered UI doesn't survive HTML-to-markdown conversion.

**Why on-demand instead of pre-built files:**

- Works on any Next.js deployment (Railway, Vercel, self-host) with zero extra steps — no build hooks, no cron, no writable filesystem required.
- First request per path per instance pays ~100-500ms (fetch + convert); subsequent requests are cache hits (~1ms).
- Cache is per-instance. When Railway scales to multiple instances, each one warms its cache independently as agents arrive. No coordination needed.
- Content stays fresh automatically (1h TTL), so changes to marketing pages show up in markdown within an hour without redeploying.

**If you ever want to pre-warm the cache** (e.g. before a press launch): loop through the sitemap and hit `/api/agent-md?path=<each>` from any machine. But for normal operation you don't need to — agents warm their own paths.

### Deferred agent-readiness features

See [`TODO.md`](TODO.md) for auth/payments items that need product decisions before shipping: OAuth / OIDC discovery, OAuth protected-resource metadata, Web Bot Auth JWKS, WebMCP, x402, UCP, ACP.

## License

Vernix is licensed under the [Elastic License 2.0 (ELv2)](LICENSE). You can use, copy, distribute, and modify the software, with the exception of offering it as a hosted or managed service. See the [LICENSE](LICENSE) file for full terms.
