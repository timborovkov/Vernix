# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # Start dev server (Turbopack)
pnpm validate         # Format + lint --fix + typecheck + test (run before every PR)
pnpm test             # Vitest unit tests
pnpm typecheck        # tsc --noEmit
pnpm lint             # ESLint
pnpm format           # Prettier write
pnpm db:push          # Push Drizzle schema to Postgres (uses dotenv for .env.local)
pnpm db:studio        # Drizzle Studio GUI
docker compose up -d  # Start Postgres + Qdrant + Minio locally
```

Run `pnpm validate` after every change. It formats, lints with autofix, typechecks, and runs all tests.

## Architecture

**Vernix** is an AI video call agent built with Next.js 16 App Router. It joins video calls (Zoom, Meet, Teams, Webex), transcribes conversations, generates summaries, and provides a live voice agent that responds to questions using RAG.

### Data Flow

1. User creates a meeting → Postgres row + Qdrant collection. Optional `metadata.silent: true` for silent mode.
2. `POST /api/agent/join` → Recall.ai bot joins the call:
   - **Voice mode (default):** bot loads `voice-agent.html` via Output Media, captures audio, responds via OpenAI Realtime API
   - **Silent mode:** bot joins without Output Media or audio recording; no `voiceSecret` generated
3. During call: Recall streams `transcript.data` → webhook → embed → Qdrant upsert. In silent mode, also triggers `handleSilentTranscript()` which detects mentions and responds via Recall's chat API.
4. Voice agent (runs in bot's browser): captures audio → OpenAI Realtime API → responds via voice, uses RAG tool
5. Call ends: `bot.call_ended` → status `processing` → `transcript.done` → generates LLM summary → status `completed`

### Key Layers

- **`src/lib/db/`** — Drizzle ORM. `users`, `meetings`, `documents`, `tasks`, `apiKeys`, and `mcpServers` tables. `meetings` has status enum (`pending → joining → active → processing → completed | failed`). `documents` tracks knowledge base uploads with optional `meetingId` FK for meeting-scoped docs and status enum (`processing → ready | failed`). `tasks` stores action items per meeting with `autoExtracted` boolean. `meetings.metadata` JSONB stores: `agenda?`, `botId?`, `voiceSecret?` (voice mode only), `summary?`, `silent?` (boolean, enables silent/text agent mode). Schema changes → `pnpm db:push`.
- **`src/lib/auth/`** — NextAuth v5 with credentials provider (email/password). `config.ts` for edge-compatible config, `index.ts` for full config with DB. `session.ts` has `requireSessionUser()` helper.
- **`src/lib/meeting-bot/`** — Provider pattern. `MeetingBotProvider` interface (with `joinMeeting(link, id, name?, options?)`, `leaveMeeting()`, `sendChatMessage()`, `onTranscript()`) with `RecallProvider` and `MockProvider`. `joinMeeting` accepts `options.silent` to omit output_media. Selected via `MEETING_BOT_PROVIDER` env var.
- **`src/lib/vector/`** — Qdrant client singleton. Each meeting gets its own collection (1536-dim Cosine) containing transcripts, meeting-scoped documents (`type:"document"`), and agenda (`type:"agenda"`). `scroll.ts` fetches transcript points only (filtered by `type:"transcript"`). `knowledge.ts` manages per-user knowledge collections. `agenda.ts` upserts/clears agenda text in meeting collections.
- **`src/lib/openai/`** — OpenAI client singleton. `embeddings.ts` for text embedding, `voice.ts` for server-side VoiceSession class (wraps OpenAI Realtime API).
- **`src/lib/agent/`** — `rag.ts` for RAG context retrieval (cross-meeting + knowledge base search with boost). Meeting collections can contain document and agenda types alongside transcripts. `prompts.ts` exports `getAgentSystemPrompt(agenda?)`, `getVoiceAgentSystemPrompt(agenda?)`, and `getSilentAgentSystemPrompt(agenda?)`. `silent.ts` handles silent agent transcript monitoring: debounce buffering (3s), mention detection ("Vernix"), rate limiting (1 response/30s), RAG-based response generation, and sending via Recall chat API.
- **`src/lib/summary/`** — `generate.ts` generates meeting summaries from transcript segments via LLM.
- **`src/lib/knowledge/`** — `parse.ts` extracts text from PDF/DOCX/TXT/MD. `chunk.ts` splits text into overlapping chunks. `process.ts` orchestrates parse → chunk → embed → Qdrant upsert.
- **`src/lib/tasks/`** — `extract.ts` uses LLM (gpt-5.4-mini JSON mode) to extract action items from transcript. `store.ts` batch inserts/replaces tasks for a meeting.
- **`src/lib/storage/`** — S3-compatible client singleton (Minio locally). `operations.ts` for upload, delete, and presigned download URLs.
- **`src/lib/mcp/`** — `server.ts` creates per-connection MCP servers exposing meeting data tools. `client.ts` manages connections to user-configured external MCP servers with connection caching.
- **`src/lib/auth/api-key.ts`** — API key generation (bcrypt-hashed) and authentication for MCP server endpoint.

### API Routes

All under `src/app/api/`:

- `meetings/route.ts` — GET list (user-scoped), POST create
- `meetings/[id]/route.ts` — GET, PATCH (allowlisted fields only), DELETE
- `meetings/[id]/transcript/route.ts` — GET full transcript from Qdrant
- `meetings/[id]/summarize/route.ts` — POST re-trigger summary generation
- `agent/join/route.ts` — POST starts bot for a meeting
- `agent/stop/route.ts` — POST stops bot, triggers processing
- `agent/respond/route.ts` — POST text-based RAG chat
- `agent/voice-token/route.ts` — GET ephemeral OpenAI Realtime token (public, verified by botSecret)
- `agent/rag/route.ts` — POST RAG search for voice agent (public, verified by botSecret)
- `agent/mcp-tool/route.ts` — POST MCP tool execution for voice agent (public, verified by botSecret)
- `webhooks/recall/transcript/route.ts` — Receives realtime transcript data from Recall
- `webhooks/recall/status/route.ts` — Receives bot lifecycle events (call_ended, transcript.done)
- `auth/[...nextauth]/route.ts` — NextAuth handlers
- `auth/register/route.ts` — User registration
- `agent/chat/route.ts` — POST streaming RAG chat (Vercel AI SDK, tool-based)
- `search/route.ts` — Vector search across meetings and knowledge base
- `knowledge/route.ts` — GET list documents (optional `?meetingId` filter), POST upload (multipart form-data, optional `meetingId` field for meeting-scoped docs)
- `knowledge/[id]/route.ts` — GET document + download URL, DELETE document (from correct collection based on meetingId)
- `meetings/[id]/tasks/route.ts` — GET list tasks, POST create task
- `meetings/[id]/tasks/[taskId]/route.ts` — PATCH update task, DELETE task
- `tasks/route.ts` — GET cross-meeting tasks (with meeting title join)
- `mcp/route.ts` — MCP server endpoint (Streamable HTTP transport, API key auth)
- `settings/api-keys/route.ts` — GET list, POST create API keys
- `settings/api-keys/[id]/route.ts` — DELETE API key
- `settings/mcp-servers/route.ts` — GET list, POST create MCP server configs
- `settings/mcp-servers/[id]/route.ts` — PATCH update, DELETE MCP server config
- `meetings/[id]/export/route.ts` — GET export meeting as Markdown or PDF (`?format=md|pdf`)
- `export/route.ts` — GET bulk export all meetings as ZIP archive

### Auth & Middleware

- `src/middleware.ts` — Protects `/dashboard/*`, `/api/meetings/*`, `/api/agent/*`, `/api/search/*`, `/api/knowledge/*`, `/api/tasks/*`, `/api/settings/*`, `/api/export`
- Public endpoints (no auth): `/api/webhooks/*`, `/api/agent/voice-token`, `/api/agent/rag`, `/api/agent/mcp-tool` (verified by botSecret), `/api/mcp` (API key auth)
- All meeting API routes check `userId` ownership via `and(eq(meetings.id, id), eq(meetings.userId, user.id))`
- RAG requires `userId` parameter to prevent cross-user data leakage

### Voice Agent

- `public/voice-agent.html` — Static page rendered inside Recall bot via Output Media
- Captures meeting audio → streams to OpenAI Realtime API → plays response audio back
- Uses ephemeral token from `/api/agent/voice-token` (authenticated by `botSecret`)
- RAG tool calls go through `/api/agent/rag`
- `voiceSecret` is generated per bot session, stored in meeting metadata, passed in URL

### UI

Shadcn/ui with base-ui primitives (not Radix). Use `render` prop instead of `asChild` for composition. Tailwind CSS v4 — config is in CSS (`globals.css` `@theme`), not `tailwind.config.js`.

## Conventions

- **Validation**: Zod v4 schemas on all API inputs (`import { z } from "zod/v4"`)
- **IDs**: UUID v4 everywhere
- **ORM**: Drizzle enforces WHERE on UPDATE/DELETE via ESLint plugin
- **Singletons**: OpenAI, Qdrant, S3, and DB clients use module-level lazy singletons via `getEnv()`
- **Env validation**: `src/lib/env.ts` validates all required env vars with Zod at first access. `RECALL_WEBHOOK_SECRET` is optional (skip verification in dev)
- **Rate limiting**: `src/lib/rate-limit.ts` — in-memory per-IP rate limiter applied to public endpoints (webhooks, voice-token, rag, mcp-tool, register)
- **Webhook verification**: `src/lib/webhooks/verify.ts` — HMAC-SHA256 signature verification for Recall webhooks (when `RECALL_WEBHOOK_SECRET` is set)
- **Data fetching**: TanStack Query (`@tanstack/react-query`) with `QueryProvider` in root layout. Query key factory at `src/lib/query-keys.ts`. Hooks use `useQuery`/`useMutation` with proper cache invalidation and optimistic updates
- **Path alias**: `@/*` maps to `src/*`
- **Error handling**: API routes use try/catch with `NextResponse.json({ error }, { status })`. Toast notifications via sonner on the client.
- **Status variant map**: `src/lib/meetings/constants.ts` — shared between meeting card and detail page

## Testing

- Tests live next to source files as `*.test.ts`
- Mock pattern: `vi.hoisted()` for mock setup, chainable DB mock, `vi.mock()` for modules
- Auth is globally mocked in `src/test/setup.ts` — `requireSessionUser` returns a test user
- Test helpers: `createJsonRequest`, `parseJsonResponse`, `fakeMeeting`, `fakeDocument` in `src/test/helpers.ts`
- `fakeMeeting()`, `fakeDocument()`, and `fakeTask()` include `userId` field matching the test user

## Checklist for Changes

- [ ] Write tests for new API routes and utility functions
- [ ] Run `pnpm validate` (format, lint, typecheck, test)
- [ ] Update `.env.example` if adding new environment variables
- [ ] Update `README.md` env table and any relevant sections
- [ ] Update `docker-compose.yml` if adding new services
- [ ] Keep webhook endpoints (`/api/webhooks/*`) public — no auth middleware

## Environment

Copy `.env.example` to `.env.local`. Required: `DATABASE_URL`, `QDRANT_URL`, `OPENAI_API_KEY`, `AUTH_SECRET`, `AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `MEETING_BOT_PROVIDER`. For Recall: `RECALL_API_KEY`, `RECALL_API_URL`. For knowledge base: `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_REGION`.
