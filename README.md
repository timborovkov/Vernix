# KiviKova — AI Video Call Agent

AI that joins your video calls, creates embeddings from the meeting content, and acts as a voice agent participant with RAG capabilities.

**Supported platforms:** Zoom, Google Meet, Microsoft Teams, and Cisco Webex.

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

| Variable               | Description                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| `DATABASE_URL`         | PostgreSQL connection string                                                               |
| `QDRANT_URL`           | Qdrant instance URL (e.g. `http://localhost:6380` or `https://your-qdrant.up.railway.app`) |
| `OPENAI_API_KEY`       | OpenAI API key (for embeddings, LLM, and Realtime API)                                     |
| `AUTH_SECRET`          | NextAuth secret — generate with `openssl rand -base64 32`                                  |
| `AUTH_URL`             | Your app's public URL for auth callbacks (e.g. `https://your-app.up.railway.app`)          |
| `NEXT_PUBLIC_APP_URL`  | Your app's public URL for webhooks and voice agent (same as `AUTH_URL`)                    |
| `MEETING_BOT_PROVIDER` | `recall` or `mock`                                                                         |
| `RECALL_API_KEY`       | Recall.ai API token                                                                        |
| `RECALL_API_URL`       | Recall.ai API base URL (region-specific, e.g. `https://eu-central-1.recall.ai/api/v1`)     |
| `S3_ENDPOINT`          | S3-compatible endpoint (e.g. `http://localhost:9002` for local Minio)                      |
| `S3_ACCESS_KEY`        | S3 access key (Minio root user for local dev)                                              |
| `S3_SECRET_KEY`        | S3 secret key (Minio root password for local dev)                                          |
| `S3_BUCKET`            | S3 bucket name for knowledge base files (default: `kivikova-knowledge`)                    |
| `S3_REGION`            | S3 region (default: `us-east-1`)                                                           |

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
