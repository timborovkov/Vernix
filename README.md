# KiviKova — AI Video Call Agent

AI that joins your video calls, creates embeddings from the meeting content, and acts as a voice agent participant with RAG capabilities.

## Tech Stack

- **Next.js 16** (App Router, Turbopack, TypeScript)
- **Shadcn/ui** + Tailwind CSS v4
- **Drizzle ORM** + PostgreSQL
- **Qdrant** for vector storage
- **OpenAI** for embeddings and voice
- **Recall.ai** for meeting bot integration

## Quick Start

### Prerequisites

- Node.js 20.9+
- pnpm
- Docker

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env file and configure
cp .env.example .env.local

# 3. Start Postgres and Qdrant
docker compose up -d

# 4. Push database schema
pnpm db:push

# 5. Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

## Scripts

| Command            | Description          |
| ------------------ | -------------------- |
| `pnpm dev`         | Start dev server     |
| `pnpm build`       | Production build     |
| `pnpm lint`        | Run ESLint           |
| `pnpm format`      | Format with Prettier |
| `pnpm db:push`     | Push schema to DB    |
| `pnpm db:generate` | Generate migrations  |
| `pnpm db:migrate`  | Run migrations       |
| `pnpm db:studio`   | Open Drizzle Studio  |

## Architecture

- **Meetings** are stored in PostgreSQL with metadata (title, join link, status, participants)
- Each meeting gets its own **Qdrant collection** for vector embeddings
- The **meeting bot** (Recall.ai) joins calls, streams audio, and generates transcripts
- Transcripts are embedded with OpenAI's `text-embedding-3-small` and stored in Qdrant
- The **voice agent** uses RAG to pull context from current and past meetings
