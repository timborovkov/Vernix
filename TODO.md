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

## P3 — UX Polish

- **Real-time status updates** — Poll or SSE so dashboard reflects meeting status changes without manual refresh
- **Error toasts** — Surface API errors to the user (e.g. shadcn sonner/toast component)
- **Meeting filters/search** — Filter dashboard by status, search by title
- **Confirmation dialogs** — Confirm before delete and before stopping an active agent

## P4 — Production Readiness

- **Authentication** — Add auth (e.g. NextAuth / Clerk) to protect dashboard and API routes
- **Rate limiting** — Protect webhook and public API endpoints
- **Env validation** — Validate required env vars at startup with Zod
