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
docker compose up -d  # Start Postgres + Qdrant locally
```

Run `pnpm validate` after every change. It formats, lints with autofix, typechecks, and runs all tests.

## Architecture

**KiviKova** is an AI video call agent built with Next.js 16 App Router. It joins video calls (Zoom, Meet, Teams, Webex), transcribes conversations, generates summaries, and provides a live voice agent that responds to questions using RAG.

### Data Flow

1. User creates a meeting → Postgres row + Qdrant collection
2. `POST /api/agent/join` → Recall.ai bot joins the call with Output Media (voice agent webpage)
3. During call: Recall streams `transcript.data` → webhook → embed → Qdrant upsert
4. Voice agent (runs in bot's browser): captures audio → OpenAI Realtime API → responds via voice, uses RAG tool
5. Call ends: `bot.call_ended` → status `processing` → `transcript.done` → generates LLM summary → status `completed`

### Key Layers

- **`src/lib/db/`** — Drizzle ORM. `users` and `meetings` tables. `meetings` has status enum (`pending → joining → active → processing → completed | failed`). Schema changes → `pnpm db:push`.
- **`src/lib/auth/`** — NextAuth v5 with credentials provider (email/password). `config.ts` for edge-compatible config, `index.ts` for full config with DB. `session.ts` has `requireSessionUser()` helper.
- **`src/lib/meeting-bot/`** — Provider pattern. `MeetingBotProvider` interface with `RecallProvider` and `MockProvider`. Selected via `MEETING_BOT_PROVIDER` env var.
- **`src/lib/vector/`** — Qdrant client singleton. Each meeting gets its own collection (1536-dim Cosine). `scroll.ts` fetches all transcript points for summary generation.
- **`src/lib/openai/`** — OpenAI client singleton. `embeddings.ts` for text embedding, `voice.ts` for server-side VoiceSession class (wraps OpenAI Realtime API).
- **`src/lib/agent/`** — `rag.ts` for RAG context retrieval (cross-meeting search with boost). `prompts.ts` has separate `AGENT_SYSTEM_PROMPT` (text) and `VOICE_AGENT_SYSTEM_PROMPT` (in-call voice).
- **`src/lib/summary/`** — `generate.ts` generates meeting summaries from transcript segments via LLM.

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
- `webhooks/recall/transcript/route.ts` — Receives realtime transcript data from Recall
- `webhooks/recall/status/route.ts` — Receives bot lifecycle events (call_ended, transcript.done)
- `auth/[...nextauth]/route.ts` — NextAuth handlers
- `auth/register/route.ts` — User registration
- `search/route.ts` — Vector search across meetings

### Auth & Middleware

- `src/middleware.ts` — Protects `/dashboard/*`, `/api/meetings/*`, `/api/agent/*`, `/api/search/*`
- Public endpoints (no auth): `/api/webhooks/*`, `/api/agent/voice-token`, `/api/agent/rag` (verified by botSecret instead)
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
- **Singletons**: OpenAI, Qdrant, and DB clients use module-level lazy singletons
- **Path alias**: `@/*` maps to `src/*`
- **Error handling**: API routes use try/catch with `NextResponse.json({ error }, { status })`. Toast notifications via sonner on the client.
- **Status variant map**: `src/lib/meetings/constants.ts` — shared between meeting card and detail page

## Testing

- Tests live next to source files as `*.test.ts`
- Mock pattern: `vi.hoisted()` for mock setup, chainable DB mock, `vi.mock()` for modules
- Auth is globally mocked in `src/test/setup.ts` — `requireSessionUser` returns a test user
- Test helpers: `createJsonRequest`, `parseJsonResponse`, `fakeMeeting` in `src/test/helpers.ts`
- `fakeMeeting()` includes `userId` field matching the test user

## Checklist for Changes

- [ ] Write tests for new API routes and utility functions
- [ ] Run `pnpm validate` (format, lint, typecheck, test)
- [ ] Update `.env.example` if adding new environment variables
- [ ] Update `README.md` env table and any relevant sections
- [ ] Update `docker-compose.yml` if adding new services
- [ ] Keep webhook endpoints (`/api/webhooks/*`) public — no auth middleware

## Environment

Copy `.env.example` to `.env.local`. Required: `DATABASE_URL`, `QDRANT_URL`, `OPENAI_API_KEY`, `AUTH_SECRET`, `AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `MEETING_BOT_PROVIDER`. For Recall: `RECALL_API_KEY`, `RECALL_API_URL`.
