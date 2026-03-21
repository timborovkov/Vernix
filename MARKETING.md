# KiviKova — Marketing Copy

## Elevator Pitch (10 seconds)

KiviKova is an AI agent that joins your video calls, transcribes everything in real time, and builds a searchable knowledge base — so you can ask "What did we decide about pricing last Tuesday?" and get an instant, accurate answer.

## One-Liner

Your AI agent for smarter meetings. Every call transcribed, embedded, and searchable.

## Tagline

Every meeting. Remembered. Searchable. Actionable.

---

## Product Description (Short)

KiviKova is an AI meeting agent that joins your Google Meet, Zoom, or Teams calls automatically. It listens, transcribes, and converts every conversation into searchable intelligence. Ask questions during or after meetings and get answers grounded in what was actually said — across your entire meeting history.

## Product Description (Full)

Teams spend 23 hours per week in meetings, yet 86% of insights are never acted on. Decisions, context, and action items disappear the moment the call ends.

KiviKova fixes this. Paste a meeting link, and an AI agent joins your call within seconds. It transcribes the conversation in real time, converts every sentence into semantic embeddings, and stores them in a per-meeting vector database. The result: a searchable knowledge base that grows with every call.

During a meeting, ask KiviKova a question by voice or text — it searches across your current call and all past meetings to give you an accurate, context-grounded answer. After the meeting, get an AI-generated summary, auto-extracted action items with assignees and deadlines, and a sentiment analysis of how the conversation went.

No more "Can someone send the notes?" No more digging through recordings. Every meeting becomes a permanent, queryable part of your organization's memory.

---

## Key Features

**Joins Any Call Instantly**
Paste a Google Meet, Zoom, or Teams link. KiviKova's bot joins in seconds — no plugins, no extensions, no calendar integrations required.

**Real-Time Transcription**
Every word captured and attributed to the right speaker. Transcripts are available live during the call and permanently after.

**Semantic Search Across All Meetings**
Ask natural language questions like "What did Sarah say about the Q4 timeline?" and get precise answers pulled from any meeting in your history.

**Voice-Powered RAG**
KiviKova doesn't just record — it understands. Using retrieval-augmented generation, it answers questions with context from current and past conversations.

**AI Meeting Summaries**
Get an executive digest after every call: key decisions, discussion topics, and collaboration sentiment — without watching the replay.

**Auto-Extracted Action Items**
Tasks with assignees and deadlines, pulled directly from the conversation. No manual note-taking required.

**Knowledge Base**
Upload documents, specs, and notes to give KiviKova deeper context. It indexes everything and uses it to give better answers during calls.

---

## How It Works

1. **Paste a meeting link** into KiviKova's dashboard
2. **An AI bot joins your call** and begins transcribing in real time
3. **Transcript chunks are embedded** using OpenAI's text-embedding-3-small model
4. **Vectors are stored** in a per-meeting Qdrant collection
5. **Ask questions** during or after the meeting — KiviKova searches across all your meetings and responds with grounded answers

---

## Target Audience

- **Engineering and product teams** running daily standups, sprint planning, and design reviews
- **Leadership teams** who need decisions and context from strategy meetings to be trackable
- **Consultancies and agencies** managing multiple client calls and needing searchable records
- **Remote-first companies** where meetings are the primary communication channel

---

## Differentiators

| Feature                       | KiviKova | Otter.ai | Fireflies | Grain |
| ----------------------------- | -------- | -------- | --------- | ----- |
| Cross-meeting semantic search | Yes      | No       | Limited   | No    |
| Voice Q&A during meetings     | Yes      | No       | No        | No    |
| Per-meeting vector storage    | Yes      | No       | No        | No    |
| Knowledge base upload         | Yes      | No       | No        | No    |
| Open architecture (self-host) | Yes      | No       | No        | No    |

---

## Pricing (Planned)

- **Free** — 5 meetings/month, basic transcription and search
- **Pro ($29/mo)** — Unlimited meetings, full RAG, knowledge base, action items
- **Enterprise** — Custom deployment, SSO, audit logs, dedicated support

---

## Hackathon Submission

### Inspiration

We wanted to bring AI agents to meetings in an interactive way. Meetings are where decisions happen, but the knowledge generated in them is trapped — in people's heads, in forgotten recordings, in notes nobody reads. We asked: what if an AI agent could sit in the meeting, build a memory of everything said, and answer questions on the spot?

### What it does

KiviKova is an autonomous AI agent that joins Google Meet calls and participates intelligently. It runs a real-time pipeline of specialized components:

1. **Joins the meeting** — Paste a link and the bot enters the call within seconds via Recall.ai
2. **Transcribes live speech** — Every utterance is captured with speaker attribution in real time
3. **Builds semantic memory** — Each transcript chunk is embedded into a per-meeting vector store (Qdrant) with cosine similarity search
4. **Reasons about context** — Uses GPT-4o with function calling to search the meeting's history (and all past meetings) before responding
5. **Speaks back into the meeting** — Generates voice responses via OpenAI Realtime API, injecting audio directly into the call

The result: an agent that actually participates in your meetings, not just records them.

### How we built it

- **Next.js 16 App Router** as the full-stack framework — API routes, server components, and the dashboard UI
- **Recall.ai** for bot deployment — handles joining Meet/Zoom/Teams and streaming real-time transcripts via webhooks
- **OpenAI text-embedding-3-small** (1536 dimensions) for converting transcript chunks into vectors
- **Qdrant** as the vector database — each meeting gets its own collection for isolated, fast search
- **OpenAI Realtime API** (WebSocket) for the voice agent — bidirectional audio with function calling for RAG tool use
- **GPT-4o** for text-based RAG responses via the `/api/agent/respond` endpoint
- **PostgreSQL + Drizzle ORM** for meeting metadata, status tracking, and the full meeting lifecycle
- **Vitest** for testing — 94 unit tests covering all API routes, the RAG pipeline, and the voice session
- **GitHub Actions** CI pipeline running tests, ESLint, and Prettier on every push

### Challenges we ran into

- **Real-time transcript processing** — Recall.ai sends partial and final transcript chunks via webhooks. We had to handle non-final chunks (skip them), empty word arrays, and malformed JSON from external sources without crashing the pipeline.
- **Cross-meeting search at scale** — Searching across many Qdrant collections in parallel required concurrency limiting (batches of 5) and partial failure tolerance — if one collection is down, the rest should still return results.
- **Voice agent connection lifecycle** — The OpenAI Realtime API is async and WebSocket-based. We had to handle race conditions: what if `close()` is called while a RAG search is in flight? What if `connect()` is called twice? We solved this with connection identity tracking and null guards.
- **Testing WebSocket-based code** — Mocking the OpenAI Realtime API's event emitter pattern required building a custom mock with a `_trigger()` helper to simulate server events in tests.

### Accomplishments that we're proud of

- **End-to-end pipeline working** — From pasting a meeting link to getting voice answers grounded in meeting history, the entire chain works
- **94 tests, zero lint warnings** — Every API route, the RAG pipeline, the webhook handler, and the voice session are thoroughly tested
- **Cross-meeting RAG** — The voice agent searches across all your meetings, not just the current one. Ask about something from last week's call and get an answer in the current meeting
- **Graceful degradation everywhere** — If OpenAI is down, the voice agent doesn't crash. If some Qdrant collections fail, you get partial results. If all fail, you get a clear error.
- **Clean architecture** — Provider pattern for meeting bots, typed error classes for the RAG pipeline, shared modules between the text and voice agents

### What we learned

- The OpenAI Realtime API is powerful but requires careful lifecycle management — WebSocket connections, async event handlers, and function calling all introduce subtle concurrency bugs
- Per-meeting vector collections in Qdrant are a great isolation pattern — each meeting's context is independent, but cross-meeting search is still possible via fan-out
- Hackathon code quality matters — the bugs we caught in review (silent error swallowing, stale connection handlers, breaking API changes) would have been demo-killers

### What's next for KiviKova

- **Speaker diarization** — Better speaker identification and tracking across meetings
- **Auto meeting summaries** — Generate executive digests when a meeting ends
- **Action item extraction** — Pull tasks, assignees, and deadlines from the conversation automatically
- **Slack and Notion export** — Push summaries and action items where your team already works
- **Multi-tenant organizations** — Workspaces with SSO, RBAC, and shared meeting intelligence
- **Proactive knowledge surfacing** — The agent suggests relevant context before you ask

---

## Tech Stack

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui
- **Backend:** PostgreSQL + Drizzle ORM, Qdrant vector database
- **AI:** OpenAI text-embedding-3-small (1536-dim), GPT-4o for responses, Realtime API for voice
- **Meeting Infrastructure:** Recall.ai for bot deployment across Meet/Zoom/Teams
- **DevOps:** Docker Compose, GitHub Actions CI, Vitest (94 tests)

---

## Vision

KiviKova becomes your organization's collective brain — every decision, discussion, and insight permanently searchable and actionable. Not just meeting notes, but meeting intelligence.
