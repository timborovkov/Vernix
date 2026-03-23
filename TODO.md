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
- ~~**Turn detection** — Semantic VAD with low eagerness; agent only responds when addressed as KiviKova/Agent/Assistant~~

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

- ~~**`meetingId` on documents** — Optional FK on `documents` table linking uploads to a specific meeting~~
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

## P11 — MCP Tool Connections

- **KiviKova MCP server** — Expose meeting data (transcripts, summaries, search, action items) as an MCP server so users can give Claude Desktop or other AI assistants access to their meeting context
- **MCP config UI** — Settings page where users paste MCP server configs (like Claude Desktop's config format)
- **MCP client runtime** — Agent connects to user-defined MCP servers at session start, discovers available tools
- **Tool routing** — Expose discovered MCP tools to the voice agent and chat agent as callable functions
- **Config storage** — Store MCP server configs per user in DB (url, auth, enabled/disabled)

## P12 — Data Export

- **Single meeting export** — Download meeting notes (summary, transcript, action items, participants) as PDF or Markdown
- **Bulk export** — Export all meetings and data as a ZIP archive (Markdown files + metadata JSON)
- **Export API** — `GET /api/meetings/[id]/export` and `GET /api/export` endpoints

## P13 — Production Hardening

- **Rate limiting** — Protect webhook and public API endpoints
- **Env validation** — Validate required env vars at startup with Zod
- **Webhook signature verification** — Verify Recall webhook payloads using signing secret

## P14 — Rebrand to Vernix.AI

- **Rename everywhere** — Package name, repo, README, CLAUDE.md, presentation, UI text, bot name, prompts, SEO metadata
- **Rename GitHub repository**
- **Register the domain and social media**
- **Domain** — Point vernix.ai to the deployment
- **Update Recall** — Bot name from "KiviKova Agent" to "Vernix Agent", webhook URLs
- **Voice agent wake words** — Change from "KiviKova" to "Vernix" in system prompt and UI hints
- **Logos** — Create proper logo set (icon, wordmark, favicon, OG image) for Vernix.AI
- **Google Stitch** — Update design system screens and branding on Stitch

## P15 — Design System and pages

- **Copy UI from the design system** – Create all the pages and components like in the design system
- **Build the landing page** – Build a proper landing page like in the design system
- **Component library** — Consistent design tokens, spacing, typography across all pages
- **Responsive polish** — Mobile-optimized dashboard and meeting detail views
- **Loading skeletons** — Replace "Loading..." text with shimmer placeholders

## P16 — User Profiles & SSO

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

## P18 — Silent Agent Mode (Text Agent)

- **Silent mode toggle** — Per-meeting toggle (in create dialog and meeting detail). This is a fundamentally different agent type: text agent instead of voice agent
- **Recall without Output Media** — Omit `output_media` and `include_bot_in_recording: { audio: false }` so the bot joins as a passive listener with no voice/screen presence
- **Text agent** — Instead of OpenAI Realtime API (audio in/out via voice-agent.html), the agent monitors the transcript stream server-side. Same RAG pipeline and tools, but no audio bridging, no WebSocket, no voice session
- **Chat-based replies** — When addressed in the transcript (by name or direct question), use Recall's chat API (`POST /api/v1/bot/{id}/send_chat_message`) to respond as a text message in the meeting chat
- **Transcript monitoring** — Server-side: watch incoming `transcript.data` webhooks for mentions/questions, run through LLM with RAG context, send response via chat API
- **UI indicator** — Show "Silent" badge on meeting card and detail page
- **Storage** — `metadata.silent: boolean` on the meeting row

## P19 — Billing with Polar

- **Polar integration** — Connect Polar.sh for subscription management
- **Pricing tiers** — Free trial for pro, Pro (x hours of meetings / month), Unlimited (not really unlimited, fair use applies)
- **Hard caps** – Fair use hard caps on uploaded context, meeting duration, token usage, embeddings creation etc for each plan
- **Usage tracking** — Track meeting minutes, API calls, and storage per user
- **Billing UI** — `/settings/billing` page with current plan, usage, and upgrade options
- **Webhook handler** — `POST /api/webhooks/polar` for subscription lifecycle events
