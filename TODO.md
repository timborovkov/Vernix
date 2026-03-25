# TODO

## P0 — Core Pipeline ~~(makes the app functional)~~ DONE

- ~~**Recall.ai transcript webhook** — `src/app/api/webhooks/recall/transcript/route.ts`~~
- ~~**Embedding pipeline** — `src/lib/vector/upsert.ts` wires transcript → embedding → Qdrant upsert~~
- ~~**Vector search endpoint** — `src/app/api/search/route.ts` with single-meeting and cross-meeting search~~

## P1 — Voice Agent ~~(the differentiator)~~ DONE

- ~~**OpenAI Realtime API integration** — `src/lib/openai/voice.ts` wraps `OpenAIRealtimeWebSocket` with RAG tool calling~~
- ~~**RAG-powered responses** — `src/lib/agent/rag.ts` builds context from Qdrant, `src/app/api/agent/respond/route.ts` provides text-based RAG endpoint~~
- ~~**Cross-meeting search** — Implemented in `/api/search` via fan-out across per-meeting collections~~

## P2 — Post-Meeting Processing ~~DONE~~

- ~~**Meeting summary generation** — After meeting ends (status → `processing`), generate a summary from all embedded segments using an LLM, store in `metadata.summary`~~
- ~~**Meeting notes UI** — Add `/dashboard/[id]` page showing transcript timeline, summary, and search within a single meeting~~
- ~~**Participants tracking** — Populate `participants` JSONB from bot transcript speaker data~~

## P3 — UX Polish ~~DONE~~

- ~~**Real-time status updates** — Poll every 5s when meetings are in transient states (joining/active/processing)~~
- ~~**Error toasts** — Sonner toasts for all API errors and success feedback~~
- ~~**Meeting filters/search** — Filter dashboard by status, search by title~~
- ~~**Confirmation dialogs** — Confirm before delete and before stopping an active agent~~
- ~~**Button loading states** — Disable buttons and show loading text during async operations~~
- ~~**SEO metadata** — Updated title and description in layout~~

## P4 — Authentication ~~DONE~~

- ~~**NextAuth setup** — Credentials provider (email/password) with JWT sessions~~
- ~~**User table** — `users` table with email, name, passwordHash; `userId` FK on meetings~~
- ~~**Session middleware** — Protects dashboard and API routes, webhooks remain public~~
- ~~**Data scoping** — All meeting queries filtered by userId, ownership checks on all endpoints~~
- ~~**Sign in / Sign up pages** — Login, register pages with auto-redirect~~

## P5 — Live Voice Agent ~~DONE~~

- ~~**Audio bridging** — Recall Output Media renders voice-agent.html which bridges getUserMedia audio ↔ OpenAI Realtime API~~
- ~~**In-call RAG** — Agent uses search_meeting_context tool via `/api/agent/rag` endpoint~~
- ~~**Turn detection** — Semantic VAD with low eagerness; agent only responds when addressed as Vernix/Agent/Assistant~~

## P6 — Chat with Meeting Notes ~~DONE~~

- ~~**Chat UI** — Chat panel on meeting detail page with streaming responses via Vercel AI SDK~~
- ~~**General Chat UI** — Collapsible chat on dashboard for cross-meeting questions~~
- ~~**Streaming RAG** — `POST /api/agent/chat` with `streamText()`, tool-based RAG search, multi-step responses~~
- ~~**Source citations** — Expandable source list with speaker, timestamp, and relevance score~~
- ~~**Tool call visualization** — "Searching meeting context..." indicator during RAG lookup~~

## P7 — Knowledge Base (file uploads + RAG) ~~DONE~~

- ~~**File upload API** — `POST /api/knowledge` accepts PDF, DOCX, TXT, MD files (multipart form-data, 10MB limit)~~
- ~~**Object storage** — Minio locally, S3-compatible in prod; `src/lib/storage/` with upload, delete, presigned URL~~
- ~~**Document chunking** — `src/lib/knowledge/chunk.ts` with sentence-boundary-aware splitting (1000 chars, 200 overlap)~~
- ~~**Unified RAG** — `getRAGContext` now searches per-user knowledge collection alongside meeting transcripts; `RAGResult` has `source: "transcript" | "document"`~~
- ~~**Knowledge base UI** — `/dashboard/knowledge` page with upload dialog, document list, status badges, delete~~

## P8 — Meeting-Scoped Knowledge ~~DONE~~

- ~~`**meetingId` on documents — Optional FK on `documents` table linking uploads to a specific meeting~~
- ~~**Upload on meeting detail page** — Upload button on `/dashboard/[id]` scoped to that meeting, chunks go into meeting's Qdrant collection~~
- ~~**Scoped RAG boost** — Meeting-scoped documents in the meeting collection get boosted automatically alongside transcripts~~
- ~~**Knowledge list integration** — Meeting detail shows only that meeting's docs; global page shows all docs~~
- ~~**Meeting DELETE cleanup** — Deleting a meeting removes its scoped documents from S3 and DB~~

## P9 — Meeting Context & Agenda ~~DONE~~

- ~~**Agenda field** — Optional free-form text field on meetings (stored in `metadata.agenda`)~~
- ~~**UI** — Editable text area on meeting detail page and in the create meeting dialog~~
- ~~**Embed for RAG** — On save, agenda text embedded into meeting's Qdrant collection with `type:"agenda"`, surfaces in RAG context~~
- ~~**Agent context** — `getAgentSystemPrompt(agenda)` and `getVoiceAgentSystemPrompt(agenda)` inject agenda into all agent prompts~~
- ~~**Summary awareness** — Agenda passed to summary generation; LLM compares planned vs discussed~~

## P10 — Action Items & Tasks ~~DONE~~

- ~~**Auto-extract action items** — `src/lib/tasks/extract.ts` uses gpt-4o-mini JSON mode to extract action items from transcript segments~~
- ~~**Task storage** — `tasks` table with cascade delete from meetings; `src/lib/tasks/store.ts` for batch insert/replace~~
- ~~**Extraction triggers** — Auto-extracts after summary in webhook `transcript.done`, manual `agent/stop`, and re-summarize endpoints~~
- ~~**Tasks API** — `GET/POST /api/meetings/[id]/tasks`, `PATCH/DELETE /api/meetings/[id]/tasks/[taskId]`, `GET /api/tasks` (cross-meeting)~~
- ~~**Tasks UI** — Action Items card on meeting detail with checkbox toggle, delete, add; dashboard widget showing pending tasks across meetings~~

## P11 — MCP Tool Connections ~~DONE~~

- ~~**MCP Server** — `src/lib/mcp/server.ts` exposes tools: `search_meetings`, `list_meetings`, `get_meeting`, `get_transcript`, `list_tasks`, `create_task`. SSE endpoint at `/api/mcp` with API key auth~~
- ~~**API Keys** — `apiKeys` table with bcrypt-hashed keys, shown once on creation. Routes at `/api/settings/api-keys`~~
- ~~**MCP Client** — `src/lib/mcp/client.ts` with `McpClientManager` connects to user-configured SSE servers, discovers tools, namespaces as `mcp_<server>_<tool>`, connection cache with 5-min TTL~~
- ~~**Agent Integration** — MCP client tools spread into chat agent's tool map alongside `searchMeetingContext`~~
- ~~**Config Storage** — `mcpServers` table for per-user server configs (name, url, apiKey, enabled)~~
- ~~**Settings UI** — `/dashboard/settings` page with API key management + MCP server config CRUD~~

## P12 — Data Export ~~DONE~~

- ~~**Single meeting export** — Download meeting notes (summary, transcript, action items, participants) as PDF or Markdown~~
- ~~**Bulk export** — Export all meetings and data as a ZIP archive (Markdown files + metadata JSON)~~
- ~~**Export API** — `GET /api/meetings/[id]/export` and `GET /api/export` endpoints~~

## P13 — Production Hardening ~~DONE~~

- ~~**Rate limiting** — In-memory per-IP rate limiter on all public endpoints (webhooks, voice-token, rag, mcp-tool, register)~~
- ~~**Env validation** — `src/lib/env.ts` validates all required env vars with Zod at first access; client singletons use `getEnv()`~~
- ~~**Webhook signature verification** — HMAC-SHA256 verification of Recall webhook payloads via `RECALL_WEBHOOK_SECRET` (optional, skip in dev)~~

## P14 — Rebrand to Vernix (vernix.app) ~~DONE~~

- ~~**Rename everywhere** — Package name, repo, README, CLAUDE.md, UI text, bot name, prompts, SEO metadata~~
- ~~**Rename GitHub repository**~~
- ~~**Register the domain and social media**~~
- ~~**Domain** — Point vernix.app to the deployment~~
- ~~**Update Recall** — Bot name from "Vernix Agent" to "Vernix Agent", webhook URLs~~
- ~~**Voice agent wake words** — Change from "Vernix" to "Vernix" in system prompt and UI hints~~
- ~~**Logo set** — Create icon, wordmark, favicon, and OG image in the style of the current site~~
- ~~**Design system doc** — Write `DESIGN.md` capturing current color palette, typography, spacing, and component patterns so they're codified and consistent~~

## P15 — UI Polish & Launch Prep ~~DONE~~

- ~~**Implement the logo set** — Start using the new logo set in the UI~~
- ~~**Loading skeletons** — Structurally correct `loading.tsx` files + inline skeleton replacements~~
- ~~**Landing page** — Hero, features, how-it-works, pain points, CTAs with benefit-driven copy~~
- ~~**Public pages** — Pricing, FAQ, Contact (with topic routing form), Terms, Privacy, About~~
- ~~**Mobile responsiveness** — Flex-wrap headers, stacked layouts on mobile, hidden button labels~~
- ~~**UI cleanup** — Empty state icons, delete old design-system/ and presentation/ folders~~
- ~~**Marketing layout** — Sticky header + footer with logo, nav, theme toggle, mobile hamburger~~
- ~~**Accent color** — Warm violet (hue 290°) on focus rings, CTAs, active states, pricing highlight~~
- ~~**Animations** — Hero fade-up, scroll reveal on features/steps, FAQ accordion, hero bg grid~~
- ~~**Auth pages** — Split layout with violet branded panel + form, mobile-friendly~~
- ~~**Dashboard header** — Extracted to shared layout component, sticky, icon+wordmark combo logo~~
- ~~**Theme system** — ThemeScript (FOUC prevention), ThemeToggle (light/dark/system cycle)~~
- ~~**Signup CRO** — Password toggle, autofill hints, value reinforcement, actionable errors~~
- ~~**Contact form** — Topic routing (question/bug/feature/enterprise) with contextual fields~~

## P16 — Dark Mode & Theme Selector ~~DONE~~

- ~~**System default** — Detect `prefers-color-scheme` on first load and apply light or dark accordingly~~
- ~~**Theme selector** — Toggle in dashboard footer and marketing header; cycles Light → Dark → System~~
- ~~**CSS variables** — All Tailwind v4 `@theme` tokens have dark-mode counterparts in `globals.css`~~
- ~~**FOUC prevention** — Blocking `ThemeScript` in `<head>` applies theme before React hydration~~
- ~~**Component audit** — Fixed hardcoded surfaces (auth panel, landing CTA) that broke in dark mode~~

## P16b — User Profiles & SSO

- **Profile page** — `/settings/profile` page where users can edit name, email, company, and avatar
- **Change password** — Current password verification + new password form
- **SSO providers** — Add Google, GitHub, and X (Twitter) OAuth providers to NextAuth config
- **Account linking** — Allow users to link multiple auth providers to one account
- **Profile API** — `PATCH /api/user/profile` endpoint for updating user details

## P17 — Vision-Based Document Parsing (low priority)

- **OpenAI Vision for PDFs** — Current PDF parsing (pdfjs-dist) extracts raw text only — images, charts, tables, and scanned pages are invisible. Use GPT-4o vision to process PDF pages as images for richer extraction
- **Image/diagram uploads** — Accept PNG, JPG, SVG uploads in knowledge base, extract descriptions via vision API
- **Hybrid parsing** — Try text extraction first; if a page has low text density, fall back to vision-based extraction
- **Cost management** — Vision API is expensive per page; add per-user limits or make it a premium feature

## P18 — Silent Agent Mode (Text Agent) ~~DONE~~

- ~~**Silent mode toggle** — Per-meeting toggle (in create dialog and meeting detail). This is a fundamentally different agent type: text agent instead of voice agent~~
- ~~**Recall without Output Media** — Omit `output_media` and `include_bot_in_recording: { audio: false }` so the bot joins as a passive listener with no voice/screen presence~~
- ~~**Text agent** — Instead of OpenAI Realtime API (audio in/out via voice-agent.html), the agent monitors the transcript stream server-side. Same RAG pipeline and tools, but no audio bridging, no WebSocket, no voice session~~
- ~~**Chat-based replies** — When addressed in the transcript (by name or direct question), use Recall's chat API (`POST /api/v1/bot/{id}/send_chat_message`) to respond as a text message in the meeting chat~~
- ~~**Transcript monitoring** — Server-side: watch incoming `transcript.data` webhooks for mentions/questions, run through LLM with RAG context, send response via chat API~~
- ~~**UI indicator** — Show "Silent" badge on meeting card and detail page~~
- ~~**Storage** — `metadata.silent: boolean` on the meeting row~~

## P19 — Switch to TanStack Query ~~DONE~~

- ~~**Replace custom hooks** — All 7 hooks (`useMeetings`, `useMeetingDetail`, `useKnowledge`, `useTasks`, `useAllTasks`, `useApiKeys`, `useMcpServers`) migrated to `useQuery`/`useMutation`~~
- ~~**Query client setup** — `QueryProvider` in root layout with 30s staleTime, 5min gcTime, refetch on focus~~
- ~~**Caching policies** — Meeting list: 10s staleTime with conditional 5s polling for transient states. Query key factory at `src/lib/query-keys.ts`~~
- ~~**Cache invalidation** — Cross-invalidation: meeting delete → meetings + tasks; task CRUD → meeting tasks + all tasks; knowledge CRUD → knowledge list~~
- ~~**Mutations** — `useMutation` with optimistic updates for task toggle and meeting delete~~
- ~~**Remove polling** — `setInterval` replaced with TanStack Query `refetchInterval` on both meetings list and meeting detail~~

## P20 — MCP Server Connection Testing ~~DONE~~

- ~~**Test button per server** — Zap icon button on each MCP server row; shows inline result (tool count + tool names, or error message)~~
- ~~**Test before save** — "Test Connection" button in the Add Server dialog; clears result when URL/API key changes~~
- ~~**Test API** — `POST /api/settings/mcp-servers/test` accepts `{ id }` (DB lookup) or `{ url, apiKey? }` (pre-save); 10s timeout~~

## P21 — Analytics & Monitoring

- **Sentry** — Error tracking and performance monitoring; instrument Next.js app, API routes, and background jobs (webhook handlers, agent pipeline)
- **PostHog / Plausible** — Product analytics: page views, feature usage (meetings created, agent joins, silent mode, chat, exports), funnel tracking
- **Custom events** — Track key actions: meeting created, agent joined, transcript received, summary generated, chat message sent, MCP tool called
- **Uptime monitoring** — External health check on `/api/health` (to be created); alert on downtime
- **Error boundaries** — React error boundaries on dashboard pages so one component failure doesn't blank the whole page

## P22 — Billing with Polar

- **Calculate the pricing** — Calculate our baseline costs and add our margins on top, decide on the pricing strategy. Use proper Claude skills to do this. Current pricing idea: Free trial for pro, Pro (x hours of meetings / month), Unlimited (not really unlimited, fair use applies)
- **Create a pricing page** — `/pricing` page with the pricing tiers and a call to action to sign up.
- **Pricing as consts in the code** — Pricing tiers as consts in the code, so we can easily change the pricing without having to change the code. Would affect billing, pricing page, and marketing.
- **Polar integration** — Connect Polar.sh for subscription management
- **Hard caps** – Fair use hard caps on uploaded context, meeting duration, token usage, embeddings creation etc for each plan
- **Usage tracking** — Track meeting minutes, API calls, and storage per user
- **Billing UI** — `/settings/billing` page with current plan, usage, and upgrade options
- **Webhook handler** — `POST /api/webhooks/polar` for subscription lifecycle events
- **Configure paywalls** — Configure paywalls for the pricing tiers. Claude Code has a paywall skill that can be used to configure paywalls.

## P23 — Meeting Recordings & Recall Data Sync

- **Audit Recall data** — Investigate what data Recall provides after a meeting: video recording (MP4), participant events, meeting metadata, speaker timeline. Map what's available via their API.
- **Copy recordings to our storage** — After `recording_done`, download the video MP4 from Recall's S3 URL (expires after 6h) and upload to our S3/Minio bucket. Store the S3 key in meeting metadata.
- **Participant data** — Fetch participant events and speaker timeline from Recall, store in meeting metadata (currently only populated from transcript speaker names).
- **Video playback UI** — Add a video player to the meeting detail page. Sync transcript timeline with video position (click a transcript line → seek to that timestamp).
- **Recording retention** — Decide on storage policy: keep forever, expire after N days, or let user choose. Estimate storage costs per meeting minute.
- **Privacy controls** — Let users disable recording storage per meeting. Delete recording when meeting is deleted. Clear deletion from S3 bucket.
