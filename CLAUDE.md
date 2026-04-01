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

- **`src/lib/db/`** — Drizzle ORM. `users`, `meetings`, `documents`, `tasks`, `apiKeys`, `mcpServers`, `mcpOauthTokens`, and `usageEvents` tables. `mcpServers` has auth fields: `authType` (none|bearer|header|basic|oauth), `authHeaderName`, `authHeaderValue`, `authUsername`, `authPassword`, `catalogIntegrationId`. `mcpOauthTokens` stores OAuth state per server (accessToken, refreshToken, expiresAt, clientId, clientSecret, codeVerifier). `users` has billing fields: `plan` (free|pro), `polarCustomerId`, `polarSubscriptionId`, `trialEndsAt`, `currentPeriodStart`, `currentPeriodEnd`. `usageEvents` tracks billable actions (voice/silent meetings, RAG queries, API requests, doc uploads) with quantity and cost. `meetings` has status enum (`pending → joining → active → processing → completed | failed`). `documents` tracks knowledge base uploads with optional `meetingId` FK for meeting-scoped docs and status enum (`processing → ready | failed`). `tasks` stores action items per meeting with `autoExtracted` boolean. `meetings.metadata` JSONB stores: `agenda?`, `botId?`, `voiceSecret?` (voice mode only), `summary?`, `silent?` (boolean, enables silent/text agent mode), `voiceActivation?` (`{ state, activatedAt?, transcriptWindow? }` — on-demand voice state machine), `voiceTelemetry?` (`{ activationCount, totalConnectedSeconds, avgSessionSeconds }` — flushed on meeting end). Schema changes → `pnpm db:push`.
- **`src/lib/auth/`** — NextAuth v5 with credentials provider (email/password). `config.ts` for edge-compatible config, `index.ts` for full config with DB. `session.ts` has `requireSessionUser()` helper.
- **`src/lib/meeting-bot/`** — Provider pattern. `MeetingBotProvider` interface (with `joinMeeting(link, id, name?, options?)`, `leaveMeeting()`, `sendChatMessage()`, `onTranscript()`) with `RecallProvider` and `MockProvider`. `joinMeeting` accepts `options.silent` to omit output_media. Selected via `MEETING_BOT_PROVIDER` env var.
- **`src/lib/vector/`** — Qdrant client singleton. Each meeting gets its own collection (1536-dim Cosine) containing transcripts, meeting-scoped documents (`type:"document"`), and agenda (`type:"agenda"`). `scroll.ts` fetches transcript points only (filtered by `type:"transcript"`). `knowledge.ts` manages per-user knowledge collections. `agenda.ts` upserts/clears agenda text in meeting collections.
- **`src/lib/openai/`** — OpenAI client singleton. `embeddings.ts` for text embedding, `voice.ts` for server-side VoiceSession class (wraps OpenAI Realtime API).
- **`src/lib/agent/`** — `rag.ts` for RAG context retrieval (cross-meeting + knowledge base search with boost). Meeting collections can contain document and agenda types alongside transcripts. `prompts.ts` exports `getAgentSystemPrompt(agenda?)`, `getVoiceAgentSystemPrompt(agenda?)`, and `getSilentAgentSystemPrompt(agenda?)`. `silent.ts` handles silent agent transcript monitoring: debounce buffering (3s), mention detection ("Vernix"), rate limiting (1 response/30s), RAG-based response generation, and sending via Recall chat API.
- **`src/lib/summary/`** — `generate.ts` generates meeting summaries from transcript segments via LLM.
- **`src/lib/knowledge/`** — `parse.ts` extracts text from PDF/DOCX/TXT/MD. `chunk.ts` splits text into overlapping chunks. `process.ts` orchestrates parse → chunk → embed → Qdrant upsert.
- **`src/lib/tasks/`** — `extract.ts` uses LLM (gpt-5.4-mini JSON mode) to extract action items from transcript. `store.ts` batch inserts/replaces tasks for a meeting.
- **`src/lib/storage/`** — S3-compatible client singleton (Minio locally). `operations.ts` for upload, delete, list, and presigned download URLs.
- **`src/lib/mcp/`** — `server.ts` creates per-connection MCP servers exposing meeting data tools (10 tools: `search_meetings`, `list_meetings`, `get_meeting`, `get_transcript`, `list_tasks`, `create_task`, `vernix_join_call`, `vernix_stop_call`, `vernix_search_meetings`, `vernix_search_tasks`). Uses `registerTool` API. Agent-control tools (`vernix_*`) use the shared service layer. `client.ts` manages connections to user-configured external MCP servers with connection caching. `auth.ts` has `buildAuthHeaders()` for 5 auth types (none, bearer, header, basic, oauth). `oauth-provider.ts` implements the MCP SDK's `OAuthClientProvider` interface with DB-backed token storage and signed JWT state parameters (uses `jose`). `transport.ts` accepts optional `authProvider` for OAuth servers.
- **`src/lib/auth/api-key.ts`** — API key generation (bcrypt-hashed) and authentication for MCP server endpoint.
- **`src/lib/billing/`** — Billing and usage tracking. `constants.ts` defines plans, pricing (€29/mo, €24/mo annual), usage rates (€3/hr voice, €1.50/hr silent), €30 monthly credit, per-plan hard caps, trial config (14 days, 90 min, full Pro features including voice, API, MCP, integrations), and `DISPLAY` — pre-formatted strings for UI (e.g. `DISPLAY.proMonthly` → "€29", `DISPLAY.trialDays` → "14"). All user-facing billing text must use constants/DISPLAY, never hardcode values. `usage.ts` records usage events, queries period summaries, and syncs metered usage to Polar. `limits.ts` resolves effective limits per plan/trial and provides `canStartMeeting()`, `canUploadDocument()`, `canMakeRagQuery()`, `canMakeApiRequest()` checks.
- **`src/lib/polar.ts`** — Polar SDK singleton client. `isPolarEnabled()` guard for optional billing.

### API Routes

All under `src/app/api/`:

- `meetings/route.ts` — GET list (user-scoped), POST create
- `meetings/[id]/route.ts` — GET, PATCH (allowlisted fields only), DELETE
- `meetings/[id]/transcript/route.ts` — GET full transcript from Qdrant
- `meetings/[id]/summarize/route.ts` — POST re-trigger summary generation
- `agent/join/route.ts` — POST starts bot for a meeting
- `agent/stop/route.ts` — POST stops bot, triggers processing
- `agent/respond/route.ts` — POST text-based RAG chat
- `agent/voice-token/route.ts` — GET ephemeral OpenAI Realtime token (public, verified by botSecret, MCP tool cache with 5-min TTL)
- `agent/rag/route.ts` — POST RAG search for voice agent (public, verified by botSecret)
- `agent/mcp-tool/route.ts` — POST MCP tool execution for voice agent (public, verified by botSecret)
- `agent/activation-status/route.ts` — POST poll/update voice activation state (public, verified by botSecret, consumes activated→responding on read)
- `agent/wake-detect/route.ts` — POST fast wake-word detection via gpt-4o-mini-transcribe (public, verified by botSecret, ~500ms latency)
- `agent/voice-fallback/route.ts` — POST chat fallback when Realtime fails (public, verified by botSecret)
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
- `billing/route.ts` — GET current plan, usage summary, limits (auth required)
- `checkout/route.ts` — GET Polar checkout redirect (public, pass `?products=<id>`)
- `portal/route.ts` — GET Polar customer portal redirect (resolves Polar customer ID from session)
- `webhooks/polar/route.ts` — POST Polar webhook handler (subscription lifecycle, customer events)
- `mcp/oauth/start/route.ts` — POST initiate OAuth flow for catalog/custom MCP server (auth required)
- `mcp/oauth/callback/route.ts` — GET OAuth callback from external provider (public, state JWT provides auth)
- `cron/route.ts` — GET unified cron dispatcher, runs due jobs based on schedule (CRON_SECRET auth). Called every 5 min. Job logic in `src/lib/cron/jobs/`.
- `meetings/[id]/recording/route.ts` — GET signed S3 download URL for meeting recording
- `auth/accept-terms/route.ts` — POST accept terms of use (sets `termsAcceptedAt` + bridge cookie)

### Public REST API (v1)

All under `src/app/api/v1/`. Authenticated via API key (`Authorization: Bearer kk_...`). Uses `withApiAuth` middleware from `src/lib/api/middleware.ts` for auth, rate limiting, billing, and usage tracking. Responses use `{ data, meta?, error? }` envelope. Cursor-based pagination.

- `v1/meetings/route.ts` — GET list (paginated), POST create (+ optional `autoJoin: true`)
- `v1/meetings/[id]/route.ts` — GET, PATCH, DELETE
- `v1/meetings/[id]/join/route.ts` — POST join agent
- `v1/meetings/[id]/stop/route.ts` — POST stop agent + trigger processing
- `v1/meetings/[id]/transcript/route.ts` — GET transcript segments
- `v1/meetings/[id]/tasks/route.ts` — GET list (paginated), POST create task
- `v1/tasks/route.ts` — GET all tasks (paginated)
- `v1/tasks/[id]/route.ts` — GET, PATCH
- `v1/search/route.ts` — GET semantic search (`?q=`, `?meetingId=`, `?limit=`)
- `v1/knowledge/route.ts` — GET list (paginated), POST upload (multipart)
- `v1/knowledge/[id]/route.ts` — GET detail + download URL, DELETE
- `v1/openapi.json/route.ts` — GET OpenAPI 3.1 specification

**Key layers:**
- `src/lib/api/constants.ts` — API version, rate limit constants (`RATE_LIMIT_STANDARD=60`, `RATE_LIMIT_EXPENSIVE=10`)
- `src/lib/api/middleware.ts` — `withApiAuth()` HOF: API key auth → rate limit → billing check → usage recording → headers
- `src/lib/api/response.ts` — Envelope helpers: `apiSuccess()`, `apiCreated()`, `apiError()`, `handleServiceError()`
- `src/lib/api/pagination.ts` — Cursor-based pagination: `encodeCursor()`, `decodeCursor()`, `buildPaginationMeta()`
- `src/lib/api/errors.ts` — Service-layer error types: `NotFoundError`, `BillingError`, `ValidationError`, `ConflictError`, `ForbiddenError`
- `src/lib/api/openapi.ts` — `buildOpenApiSpec()` generates OpenAPI 3.1 spec programmatically
- `src/lib/services/` — Framework-agnostic business logic (used by both internal routes and v1 API): `meetings.ts`, `agent.ts`, `tasks.ts`, `search.ts`, `transcripts.ts`, `knowledge.ts`

**API docs:** Interactive docs at `/docs` (Scalar) loading spec from `/api/v1/openapi.json`

### Auth & Middleware

- `src/middleware.ts` — Protects `/dashboard/*`, `/api/meetings/*`, `/api/agent/*`, `/api/search/*`, `/api/knowledge/*`, `/api/tasks/*`, `/api/settings/*`, `/api/billing`, `/api/export`
- Public endpoints (no auth): `/api/webhooks/*` (incl. Polar), `/api/checkout`, `/api/portal`, `/api/agent/voice-token`, `/api/agent/rag`, `/api/agent/mcp-tool`, `/api/agent/activation-status`, `/api/agent/wake-detect`, `/api/agent/voice-fallback` (all verified by botSecret), `/api/mcp` (API key auth), `/api/mcp/oauth/callback` (state JWT provides auth), `/api/v1/*` (API key auth via `withApiAuth`, not in middleware matcher)
- All meeting API routes check `userId` ownership via `and(eq(meetings.id, id), eq(meetings.userId, user.id))`
- RAG requires `userId` parameter to prevent cross-user data leakage
- Terms acceptance enforced in middleware: authenticated users without `termsAcceptedAt` (in JWT or `terms_accepted` cookie) are redirected to `/accept-terms`
- Authenticated users on `/login` or `/register` are redirected to `/dashboard` (or `/accept-terms` if terms not accepted)

### Voice Agent (On-Demand Realtime)

- `public/voice-agent.html` — Static page rendered inside Recall bot via Output Media
- **Dual-path wake detection**: fast path (VAD + gpt-4o-mini-transcribe, ~500ms) and slow fallback (Recall transcript webhook, ~2-4s)
- Fast path: ScriptProcessor captures audio → RMS VAD detects speech → 0.8s buffer → POST to `/api/agent/wake-detect` → transcribe → keyword match → activate directly
- Slow path: Recall transcript webhook → `activation.ts` debounce (0.5s) → keyword match → write to DB → poll detects activation
- Wake words: "vernix" + fuzzy variants (varnix, burnix, fernix, etc.) + "agent" + "assistant" — shared `WAKE_WORDS` constant in `activation.ts`
- On activation: plays acknowledgement → fetches voice token (pre-cached) → connects OpenAI Realtime → flushes 10s audio buffer → responds
- Auto-closes Realtime session after 15s idle, returns to polling
- Fallback: if Realtime fails within 4s, sends text response via `/api/agent/voice-fallback`
- Activation state consumed on read (activated → responding) to prevent duplicate triggers
- `voiceSecret` is generated per bot session, stored in meeting metadata, passed in URL
- `src/lib/agent/activation.ts` — Wake detection state machine, shared `WAKE_WORDS` constant, transcript buffer
- `src/lib/agent/telemetry.ts` — Per-meeting activation count, session duration, wake-detect call tracking

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

### Test Quality Rules

Tests must verify **real behavior**, not just confirm that mocks return what you told them to. A test that only does `expect(data.field).toBe(mockValue)` without logic in between is worthless — delete it or make it meaningful.

**Every test should answer: "What bug would this catch?"** If the answer is "none", delete it.

**What makes a test strong:**

- Tests real logic: validation rejection, branching, state transitions, math, parsing
- Tests negative cases: invalid input rejected, unauthorized access blocked, missing data handled
- Verifies values passed TO dependencies (not just what comes back from mocks): assert `mockDb.set` was called with `{ status: "processing" }`, assert `hash` was called with `(password, 12)`
- Would break if the implementation logic changed

**What makes a test weak (don't write these):**

- Only asserts that a mock's return value came out the other end: `mock.mockReturnValue(x); expect(result).toBe(x)` — tests nothing
- Mocks away the thing being tested: mocking bcrypt in a password test defeats the purpose
- Only tests happy paths with no error/edge cases
- No negative assertions (`expect(x).not.toHaveBeenCalled()`)

**Specific patterns:**

- **Rate limiting**: Do NOT mock `rateLimitByIp`. Use the real rate limiter. Import `resetRateLimits` in `beforeEach`. Add a test that exceeds the limit and expects 429.
- **Bcrypt**: Keep mocked for speed, but assert `hash` was called with `(password, 12)` and verify the hash output was passed to the DB.
- **DB writes**: Assert `mockDb.set` or `mockDb.values` was called with the correct values — this verifies your route actually transforms and stores data correctly.
- **State transitions**: Verify the status value in `set()` calls (e.g., `{ status: "processing" }`), not just that `set()` was called.
- **Bot secret verification**: All public agent endpoints must have a test for invalid bot secret returning 403.

## Checklist for Changes

- [ ] Write meaningful tests for new API routes and utility functions (see Test Quality Rules)
- [ ] Run `pnpm validate` (format, lint, typecheck, test) — **mandatory after every change**
- [ ] Update `.env.example` if adding new environment variables
- [ ] Update `README.md` env table and any relevant sections
- [ ] Update `docker-compose.yml` if adding new services
- [ ] Keep webhook endpoints (`/api/webhooks/*`) public — no auth middleware
- [ ] Keep `CLAUDE.md` and `AGENTS.md` in sync — they should have identical content
- [ ] Update internal docs in `docs/` when changing related features (billing, architecture, pricing, cron jobs, etc.)
- [ ] Mark completed items as done in `TODO.md` when shipping changes

## Environment

Copy `.env.example` to `.env.local`. Required: `DATABASE_URL`, `QDRANT_URL`, `OPENAI_API_KEY`, `AUTH_SECRET`, `AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `MEETING_BOT_PROVIDER`. For Recall: `RECALL_API_KEY`, `RECALL_API_URL`. For knowledge base: `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_REGION`. For billing: `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `NEXT_PUBLIC_POLAR_PRODUCT_ID_PRO_MONTHLY`, `NEXT_PUBLIC_POLAR_PRODUCT_ID_PRO_ANNUAL`, `POLAR_SERVER`.
