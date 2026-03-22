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

## P4 — Production Readiness

- **Authentication** — Add auth (e.g. NextAuth / Clerk) to protect dashboard and API routes
- **Rate limiting** — Protect webhook and public API endpoints
- **Env validation** — Validate required env vars at startup with Zod

## P5 — Live Voice Agent

- **Audio bridging** — Connect Recall.ai bot audio stream to OpenAI Realtime API bidirectionally
- **In-call RAG** — Agent listens, gets asked questions, searches transcript context, and responds via voice
- **Turn detection** — Handle when to inject agent responses vs. let humans talk

## P6 — Knowledge Base (file uploads + RAG)

- **File upload API** — `POST /api/knowledge` accepts PDF, DOCX, TXT, MD files
- **Object storage** — Minio / S3 for file persistence
- **Document chunking** — Split uploaded files into chunks, embed, store in a per-org Qdrant collection
- **Unified RAG** — Extend `getRAGContext` to search both meeting transcripts and uploaded documents
- **Knowledge base UI** — Upload page, file list, delete files

## P7 — Action Items & Tasks

- **Auto-extract action items** — Post-meeting LLM pass to identify action items, decisions, and follow-ups from transcript
- **Task storage** — New `tasks` table linked to meetings (title, assignee, status, due date)
- **Tasks UI** — Display action items on meeting detail page, allow marking complete
- **Cross-meeting task view** — Dashboard widget showing all open tasks across meetings

## P8 — MCP & Integrations

- **MCP server** — Expose meeting data (transcripts, summaries, action items) as MCP tools for Claude Desktop and other AI assistants
- **Calendar integration** — Auto-create meetings from Google Calendar / Outlook events
- **Data connectors** — Let agent access external tools (Slack, Linear, Notion) for richer context during calls

## P9 — Design System

- **Component library** — Consistent design tokens, spacing, typography across all pages
- **Dark mode** — Theme toggle with proper CSS variable support
- **Responsive polish** — Mobile-optimized dashboard and meeting detail views
- **Loading skeletons** — Replace "Loading..." text with shimmer placeholders
