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

## P7 — Knowledge Base (file uploads + RAG)

- **File upload API** — `POST /api/knowledge` accepts PDF, DOCX, TXT, MD files
- **Object storage** — Minio / S3 for file persistence
- **Document chunking** — Split uploaded files into chunks, embed, store in a per-org Qdrant collection
- **Unified RAG** — Extend `getRAGContext` to search both meeting transcripts and uploaded documents
- **Knowledge base UI** — Upload page, file list, delete files

## P8 — Meeting Context & Agenda

- **Agenda field** — Optional free-form text field on meetings (stored in `metadata.agenda`) for agenda, prep notes, goals, or background info
- **UI** — Editable text area on meeting detail page and in the create meeting dialog (optional)
- **Embed for RAG** — On save, embed the agenda text into the meeting's Qdrant collection so it surfaces in search and RAG context
- **Agent context** — Include agenda in the system prompt for voice agent and chat agent so they know what the call is about
- **Summary awareness** — Pass agenda to the summary generation prompt so the LLM can compare what was planned vs. what was discussed

## P9 — Action Items & Tasks

- **Auto-extract action items** — Post-meeting LLM pass to identify action items, decisions, and follow-ups from transcript
- **Task storage** — New `tasks` table linked to meetings (title, assignee, status, due date)
- **Tasks UI** — Display action items on meeting detail page, allow marking complete, removing or modifying
- **Cross-meeting task view** — Dashboard widget showing all open tasks and action items across meetings

## P10 — MCP Tool Connections

- **KiviKova MCP server** — Expose meeting data (transcripts, summaries, search, action items) as an MCP server so users can give Claude Desktop or other AI assistants access to their meeting context
- **MCP config UI** — Settings page where users paste MCP server configs (like Claude Desktop's config format)
- **MCP client runtime** — Agent connects to user-defined MCP servers at session start, discovers available tools
- **Tool routing** — Expose discovered MCP tools to the voice agent and chat agent as callable functions
- **Config storage** — Store MCP server configs per user in DB (url, auth, enabled/disabled)

## P11 — Data Export

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

## P17 — Billing with Polar

- **Polar integration** — Connect Polar.sh for subscription management
- **Pricing tiers** — Free (limited meetings/month), Pro (unlimited), Enterprise (team features)
- **Usage tracking** — Track meeting minutes, API calls, and storage per user
- **Billing UI** — `/settings/billing` page with current plan, usage, and upgrade options
- **Webhook handler** — `POST /api/webhooks/polar` for subscription lifecycle events
