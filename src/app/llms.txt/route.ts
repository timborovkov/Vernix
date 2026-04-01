import { DISPLAY, FREE_TRIAL, LIMITS, PLANS } from "@/lib/billing/constants";
import { getIntegrations, CATEGORIES } from "@/lib/integrations/catalog";
import { RATE_LIMIT_STANDARD, RATE_LIMIT_EXPENSIVE } from "@/lib/api/constants";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://vernix.app";

function buildContent(): string {
  const integrations = getIntegrations();
  const available = integrations.filter((i) => i.status === "available");
  const comingSoon = integrations.filter((i) => i.status === "coming-soon");

  const availableByCategory = CATEGORIES.map((cat) => {
    const items = available.filter((i) => i.category === cat.value);
    if (items.length === 0) return "";
    return `### ${cat.label}\n${items.map((i) => `- ${i.name}: ${i.description}`).join("\n")}`;
  })
    .filter(Boolean)
    .join("\n\n");

  const comingSoonList =
    comingSoon.length > 0
      ? `\n\n## Coming Soon\n\n${comingSoon.map((i) => `- ${i.name}: ${i.description}`).join("\n")}`
      : "";

  return `# Vernix

> An AI assistant that joins your video calls, connects to your tools, and answers questions with real business data during meetings.

## What Vernix Does

Vernix is an AI meeting assistant that joins Zoom, Google Meet, Microsoft Teams, and Webex calls. It connects to tools like Slack, Linear, GitHub, and CRM systems, then answers questions and takes action during the call using live data. It also transcribes conversations, generates summaries, extracts action items, and provides searchable meeting history.

## Key Features

- Tool Integrations: Connect Slack, Linear, GitHub, or your CRM. Ask Vernix during a call and get answers from your connected tools.
- Voice Agent: A live voice agent that listens and responds during calls. Say "Vernix" followed by your question.
- Silent Mode: Text-only agent that responds via meeting chat. No audio, no disruption.
- Meeting Transcription: Real-time, speaker-identified transcription. Searchable immediately.
- AI Summaries: Automatic summaries with key decisions after every call.
- Action Items: Tasks extracted from conversations and tracked per meeting.
- Cross-Meeting Search: Semantic search across all your meetings and documents.
- Knowledge Base: Upload PDFs, DOCX, TXT, or Markdown. The agent uses them during calls.

## Pricing

### Free Plan
- ${LIMITS[PLANS.FREE].meetingsPerMonth} silent meetings per month, ${LIMITS[PLANS.FREE].meetingMinutesPerMonth} minutes total
- ${LIMITS[PLANS.FREE].ragQueriesPerDay} AI queries per day
- ${LIMITS[PLANS.FREE].documentsCount} documents, ${LIMITS[PLANS.FREE].totalStorageMB}MB storage
- No credit card required

### Pro Plan
- ${DISPLAY.proMonthly}/month (or ${DISPLAY.proAnnual}/month billed annually)
- ${FREE_TRIAL.days}-day free trial with ${FREE_TRIAL.totalMinutes} minutes of call time
- Voice agent, silent mode, and tool integrations
- ${LIMITS[PLANS.PRO].documentsCount} documents, ${LIMITS[PLANS.PRO].totalStorageMB}MB storage
- ${LIMITS[PLANS.PRO].ragQueriesPerDay} AI queries per day
- ${DISPLAY.monthlyCredit} monthly usage credit included
- Voice calls: ${DISPLAY.voiceRate}, silent calls: ${DISPLAY.silentRate}
- Credit covers ~${DISPLAY.voiceHoursPerCredit}h voice or ~${DISPLAY.silentHoursPerCredit}h silent per month
- API access (${LIMITS[PLANS.PRO].apiRequestsPerDay} requests/day) and MCP server/client connections

## Available Integrations

${availableByCategory}${comingSoonList}

## API Quick Start: Zero to Meeting Summary

The full meeting lifecycle via API. Requires a Pro plan and an API key.

### Step 1: Get an API key

Create one at ${BASE_URL}/dashboard/settings. All requests use:
Authorization: Bearer kk_your_api_key_here

### Step 2: Create a meeting

POST ${BASE_URL}/api/v1/meetings
Content-Type: application/json

{
  "title": "Weekly Standup",
  "joinLink": "https://meet.google.com/abc-defg-hij"
}

Response (201):
{
  "data": {
    "id": "meeting-uuid",
    "title": "Weekly Standup",
    "status": "pending",
    ...
  }
}

Optional fields: "agenda" (string, up to 10k chars), "silent" (boolean, text-only mode), "noRecording" (boolean), "autoJoin" (boolean, skips step 3).

### Step 3: Join the agent to the call

POST ${BASE_URL}/api/v1/meetings/{id}/join

Response (200):
{
  "data": {
    "botId": "recall-bot-id",
    "status": "active"
  }
}

The agent joins the video call. Status transitions: pending -> joining -> active.
In voice mode (default), the agent listens and responds to questions when you say "Vernix".
In silent mode, it responds via the meeting chat when someone types @Vernix.

Shortcut: Use "autoJoin": true in Step 2 to create + join in one call.

### Step 4: Wait for the call to happen

While the meeting is active, the agent:
- Transcribes the conversation in real time
- Responds to questions using RAG (voice or chat)
- Connects to your configured integrations (Slack, Linear, GitHub, etc.)

You can check the meeting status at any time:

GET ${BASE_URL}/api/v1/meetings/{id}

The "status" field will be "active" while the call is ongoing.

### Step 5: Stop the agent and trigger processing

POST ${BASE_URL}/api/v1/meetings/{id}/stop

Response (200):
{
  "data": {
    "status": "processing"
  }
}

This stops the agent, then automatically:
1. Generates an AI summary of the meeting
2. Extracts action items / tasks from the conversation
3. Sets status to "completed" when done

### Step 6: Get the results

Once status is "completed", retrieve the outputs:

Meeting details (includes summary in metadata):
GET ${BASE_URL}/api/v1/meetings/{id}

Full transcript:
GET ${BASE_URL}/api/v1/meetings/{id}/transcript

Extracted tasks:
GET ${BASE_URL}/api/v1/meetings/{id}/tasks

### Step 7: Search across meetings

Search all your meeting transcripts and knowledge base:
GET ${BASE_URL}/api/v1/search?q=what+did+we+decide+about+pricing

### Meeting Status Lifecycle

pending -> joining -> active -> processing -> completed
                                           -> failed (if something went wrong)

- "pending": Created, agent not yet joined
- "joining": Agent is connecting to the call
- "active": Agent is in the call, transcribing
- "processing": Call ended, generating summary and tasks
- "completed": Summary and tasks ready
- "failed": Something went wrong (can retry join)

### One-Command Example (curl)

Create a meeting and join immediately:

curl -X POST ${BASE_URL}/api/v1/meetings \\
  -H "Authorization: Bearer kk_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"title": "Quick Sync", "joinLink": "https://meet.google.com/abc-defg-hij", "autoJoin": true}'

Stop the meeting and get the summary:

curl -X POST ${BASE_URL}/api/v1/meetings/{id}/stop \\
  -H "Authorization: Bearer kk_your_api_key"

curl ${BASE_URL}/api/v1/meetings/{id} \\
  -H "Authorization: Bearer kk_your_api_key"

## API Reference

- API Documentation (interactive): ${BASE_URL}/docs
- OpenAPI Spec (machine-readable): ${BASE_URL}/api/v1/openapi.json
- Authentication: Bearer token with API key
- Rate Limits: ${RATE_LIMIT_STANDARD} requests/minute standard, ${RATE_LIMIT_EXPENSIVE} requests/minute for search/agent operations
- Daily Quota: ${LIMITS[PLANS.PRO].apiRequestsPerDay} requests/day (Pro plan)
- Response Format: { "data": ..., "meta": { "hasMore": bool, "nextCursor": string } }
- Error Format: { "error": { "code": "NOT_FOUND", "message": "Meeting not found" } }
- Pagination: Cursor-based. Pass ?limit=20&cursor=opaque_string

### All REST API Endpoints

Meetings:
- POST /api/v1/meetings — Create meeting (+ optional autoJoin)
- GET /api/v1/meetings — List meetings (?status=completed&limit=20&cursor=...)
- GET /api/v1/meetings/:id — Get meeting details + summary
- PATCH /api/v1/meetings/:id — Update meeting (title, joinLink, agenda, silent, muted)
- DELETE /api/v1/meetings/:id — Delete meeting and all associated data
- POST /api/v1/meetings/:id/join — Join agent to call
- POST /api/v1/meetings/:id/stop — Stop agent, trigger summary + task extraction
- GET /api/v1/meetings/:id/transcript — Get full transcript with speaker labels
- GET /api/v1/meetings/:id/tasks — List tasks for this meeting
- POST /api/v1/meetings/:id/tasks — Create a task manually

Tasks:
- GET /api/v1/tasks — List all tasks across meetings (?status=open)
- GET /api/v1/tasks/:id — Get task details
- PATCH /api/v1/tasks/:id — Update task (title, assignee, status, dueDate)

Search:
- GET /api/v1/search — Semantic search (?q=query&meetingId=...&limit=10)

Integrations:
- GET /api/v1/integrations — List connected integrations (Slack, Linear, GitHub, etc.)

Knowledge Base:
- GET /api/v1/knowledge — List documents (?meetingId=...)
- POST /api/v1/knowledge — Upload document (multipart/form-data, field: "file")
- GET /api/v1/knowledge/:id — Get document details + download URL
- DELETE /api/v1/knowledge/:id — Delete document

### MCP Server

For AI assistants (Claude Desktop, Cursor, etc.) — same API key, richer tool interface.

MCP Endpoint: ${BASE_URL}/api/mcp
Transport: Streamable HTTP (with SSE fallback)

Claude Desktop config:
{
  "mcpServers": {
    "vernix": {
      "url": "${BASE_URL}/api/mcp",
      "headers": { "Authorization": "Bearer kk_your_api_key" }
    }
  }
}

Available MCP tools:
- search_meetings — Search transcripts and knowledge base via vector similarity
- list_meetings — List meetings with optional status filter
- get_meeting — Get meeting details including summary and agenda
- get_transcript — Get full transcript with speaker labels
- list_tasks — List action items across meetings
- create_task — Create a task for a specific meeting
- vernix_join_call — Create a meeting and join the agent to a call
- vernix_stop_call — Stop the agent and trigger processing
- vernix_search_meetings — Semantic search with structured results
- vernix_search_tasks — Search and filter tasks
- list_integrations — List connected integrations (Slack, Linear, GitHub, etc.)

## Links

- Homepage: ${BASE_URL}
- Tool Integrations: ${BASE_URL}/features/integrations
- Meeting Memory: ${BASE_URL}/features/meeting-memory
- Knowledge Base: ${BASE_URL}/features/context
- Pricing: ${BASE_URL}/pricing
- FAQ: ${BASE_URL}/faq
- Contact: ${BASE_URL}/contact
- API Docs: ${BASE_URL}/docs
- OpenAPI Spec: ${BASE_URL}/api/v1/openapi.json
`;
}

export function GET() {
  return new Response(buildContent(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
