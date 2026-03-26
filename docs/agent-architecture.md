# Agent Architecture Playbook (Internal)

This document inventories all Vernix agents and modes: what each does, where it's used, which tools it can call, how calls are routed, which models are used, and detailed lifecycle flows.

---

## Agents & Modes

Vernix has three agent interfaces, all sharing the same RAG and MCP infrastructure:

| Agent        | Model              | Where It Runs                         | Trigger                         | Output                           |
| ------------ | ------------------ | ------------------------------------- | ------------------------------- | -------------------------------- |
| Voice Agent  | `gpt-realtime-1.5` | Recall bot browser (voice-agent.html) | Wake words in transcript        | Audio via OpenAI Realtime API    |
| Silent Agent | `gpt-5.4-mini`     | Server-side (transcript webhook)      | "Vernix" mention in transcript  | Text via Recall chat API         |
| Chat Agent   | `gpt-5.4`          | Server-side (API route)               | User sends message in dashboard | Streaming text via Vercel AI SDK |

There is also a **Respond** endpoint (`gpt-5.4`) for direct single-turn Q&A, used by the legacy respond API.

---

## Tool Inventory

### Built-in Tools

| Tool                     | Voice | Silent                         | Chat                         | Description                                    |
| ------------------------ | ----- | ------------------------------ | ---------------------------- | ---------------------------------------------- |
| `search_meeting_context` | Yes   | No (context injected directly) | Yes (`searchMeetingContext`) | RAG search across transcripts + knowledge base |
| `leave_meeting`          | Yes   | Yes                            | No                           | Disconnect bot from meeting                    |
| `switch_to_silent`       | Yes   | No                             | No                           | Switch from voice to text mode                 |
| `mute_self`              | Yes   | Yes                            | No                           | Mute agent until host unmutes                  |

### MCP Tools

External MCP tools are dynamically loaded per user. They're available in all three agents.

**Namespacing:** `mcp__{serverIdNoHyphens}__{toolName}` (e.g., `mcp__abc123__lookup_customer`)

**Loading:** `McpClientManager.connectForUser(userId)` with 10s timeout per server. Tools are cached for 5 minutes in the voice-token endpoint.

---

## Models

| Endpoint               | Model              | Parameters                                                              |
| ---------------------- | ------------------ | ----------------------------------------------------------------------- |
| Voice Realtime         | `gpt-realtime-1.5` | PCM 24kHz, voice "cedar", semantic VAD (low eagerness)                  |
| Silent Response        | `gpt-5.4-mini`     | `max_completion_tokens: 200`, `temperature: 0.7`, 500-char response cap |
| Chat (streaming)       | `gpt-5.4`          | Vercel AI SDK `streamText()`, max 10 tool-call rounds                   |
| Respond (single-turn)  | `gpt-5.4`          | `max_completion_tokens: 1024`, `temperature: 0.7`                       |
| Summary Generation     | `gpt-5.4-mini`     | Used in `generateMeetingSummary()`                                      |
| Action Item Extraction | `gpt-5.4-mini`     | JSON mode, extracts tasks from transcript                               |

---

## RAG System

All agents use the same RAG pipeline (`src/lib/agent/rag.ts`):

1. Create embedding of the query via OpenAI
2. Search collections in parallel (max 5 concurrent):
   - All user's meeting collections (active/completed)
   - User's knowledge base collection
3. Boost current meeting results by 1.15x
4. Return top 10 results by score

| Parameter               | Value                            |
| ----------------------- | -------------------------------- |
| Max results             | 10                               |
| Score threshold         | 0                                |
| Boost factor            | 1.15 (current meeting only)      |
| Max concurrent searches | 5                                |
| Embedding model         | OpenAI text-embedding (1536-dim) |

---

## Voice Mode Lifecycle (On-Demand Realtime)

```
Bot joins meeting
    |
    v
HTML page loads in Recall bot browser
    |
    v
Start audio capture (24kHz PCM) + circular 10s buffer
    |
    v
Poll /api/agent/activation-status every 2s  <---------+
    |                                                   |
    v                                                   |
[Server-side: transcript webhook detects                |
 wake word in spoken text]                              |
    |                                                   |
    v                                                   |
activation.ts buffers chunks (1.5s debounce)            |
    |                                                   |
    v                                                   |
Rate limit check (1 per 15s)                            |
    |                                                   |
    v                                                   |
Write state="activated" + transcriptWindow to metadata  |
    |                                                   |
    v                                                   |
Poll returns state="activated"                          |
Server atomically consumes: activated -> responding     |
    |                                                   |
    v                                                   |
Play acknowledgement beep                               |
    |                                                   |
    v                                                   |
Fetch ephemeral token from /api/agent/voice-token       |
    |                                                   |
    v                                                   |
Connect to wss://api.openai.com/v1/realtime             |
    |                                                   |
    v                                                   |
On session.created:                                     |
  - Inject transcript window as conversation context    |
  - Flush 10s audio ring buffer                         |
  - Send response.create to trigger initial response    |
    |                                                   |
    v                                                   |
Model responds via audio                                |
    |                                                   |
    v                                                   |
15s idle timeout starts after response ends             |
    |                                                   |
    +-- Follow-up speech detected? Reset timer          |
    |                                                   |
    v                                                   |
Timeout expires -> close WebSocket                      |
    |                                                   |
    v                                                   |
Send sessionDurationMs to /api/agent/activation-status  |
    |                                                   |
    +----> Return to polling --------------------------->+
```

### Fallback Path

If OpenAI Realtime fails to connect within 5 seconds:

1. HTML page calls `POST /api/agent/voice-fallback`
2. Server generates text response via `generateAgentResponse()` (gpt-5.4-mini)
3. Sends response via Recall chat API (`sendChatMessage`)
4. Returns to polling

### Guards & Limits

| Guard              | Value                          | Purpose                                       |
| ------------------ | ------------------------------ | --------------------------------------------- |
| Wake words         | "vernix", "agent", "assistant" | Case-insensitive substring match              |
| Debounce           | 1.5s                           | Wait for speaker to finish                    |
| Rate limit         | 1 activation per 15s           | Prevent rapid re-triggers                     |
| Idle timeout       | 15s                            | Auto-close session after response             |
| Fallback timeout   | 5s                             | Fall back to chat if Realtime fails           |
| Audio buffer       | 10s (circular)                 | Ensure model hears full question              |
| Transcript window  | 30s rolling                    | Context for model on activation               |
| Consume-on-read    | activated -> responding        | Prevent duplicate activations                 |
| fallbackFired flag | Per-activation                 | Prevent orphaned WebSocket/duplicate fallback |

---

## Silent Mode Lifecycle

```
Bot joins meeting (silent=true, no output_media)
    |
    v
Transcript webhook receives chunks from Recall
    |
    v
silent.ts buffers chunks (3s debounce)
    |
    v
Check spoken text for "vernix" mention
    |
    v
Rate limit check (1 per 30s)
    |
    v
generateAgentResponse():
  - RAG search for context
  - Load MCP tools
  - gpt-5.4-mini completion (max 200 tokens)
  - One round of tool calls
    |
    v
Send response via Recall chat API (max 500 chars)
    |
    v
Handle tool results:
  - leave_meeting -> disconnect bot, trigger processMeetingEnd
  - mute_self -> set metadata.muted=true
```

### Guards & Limits

| Guard             | Value                   | Purpose                                                  |
| ----------------- | ----------------------- | -------------------------------------------------------- |
| Trigger keyword   | "vernix" only           | Narrower than voice mode                                 |
| Debounce          | 3s                      | Longer than voice (text is less urgent)                  |
| Rate limit        | 1 response per 30s      | Prevent chat spam                                        |
| Speaker isolation | Checks spoken text only | Avoids false positive from speaker name "Vernix Support" |
| Response cap      | 500 characters          | Keep chat messages concise                               |

---

## Meeting Lifecycle

```
pending -----> joining -----> active -----> processing -----> completed
   |                            |                                |
   v                            |                                v
 failed                    (agents run)                      (summary +
   ^                            |                            tasks stored)
   |                            v
   +--- join retry         bot.call_ended webhook
                           or /agent/stop
                           or /agent/leave
```

### Status Transitions

| From            | To         | Trigger                                                 |
| --------------- | ---------- | ------------------------------------------------------- |
| pending         | joining    | `POST /api/agent/join`                                  |
| joining         | active     | Bot successfully joined                                 |
| pending/joining | failed     | Join error                                              |
| active          | processing | `bot.call_ended` webhook, `/agent/stop`, `/agent/leave` |
| processing      | completed  | `transcript.done` webhook (summary generated)           |

### processMeetingEnd Flow

1. Scroll full transcript from Qdrant
2. Generate summary via LLM
3. Store summary in meeting metadata
4. Extract action items via LLM (JSON mode)
5. Store tasks in database
6. Set status to "completed"

---

## API Route Map

### Authenticated (user session required)

| Route                | Method | Purpose                      |
| -------------------- | ------ | ---------------------------- |
| `/api/agent/join`    | POST   | Start bot for meeting        |
| `/api/agent/stop`    | POST   | Stop bot, trigger processing |
| `/api/agent/chat`    | POST   | Streaming RAG chat           |
| `/api/agent/respond` | POST   | Single-turn RAG Q&A          |

### Public (bot-secret verified)

| Route                          | Method | Purpose                            |
| ------------------------------ | ------ | ---------------------------------- |
| `/api/agent/voice-token`       | GET    | Ephemeral OpenAI Realtime token    |
| `/api/agent/rag`               | POST   | RAG search for voice agent         |
| `/api/agent/mcp-tool`          | POST   | MCP tool execution                 |
| `/api/agent/activation-status` | POST   | Poll/update voice activation state |
| `/api/agent/voice-fallback`    | POST   | Chat fallback when Realtime fails  |
| `/api/agent/leave`             | POST   | Bot leaves meeting                 |
| `/api/agent/switch-mode`       | POST   | Switch voice to silent             |
| `/api/agent/mute-self`         | POST   | Mute agent                         |

### Webhooks (no auth, payload-validated)

| Route                             | Method | Events                                         |
| --------------------------------- | ------ | ---------------------------------------------- |
| `/api/webhooks/recall/transcript` | POST   | `transcript.data` - realtime transcript chunks |
| `/api/webhooks/recall/status`     | POST   | `bot.call_ended`, `transcript.done`            |

---

## Telemetry

Per-meeting voice telemetry tracked in-memory, flushed to `metadata.voiceTelemetry` on meeting end:

| Metric                  | Source                                           |
| ----------------------- | ------------------------------------------------ |
| `activationCount`       | `recordActivation()` in activation.ts            |
| `totalConnectedSeconds` | `recordSessionEnd()` via activation-status route |
| `avgSessionSeconds`     | Computed on flush                                |

Displayed in dashboard meeting detail page under "Voice Agent Stats".

---

## Mute State

Mute is a cross-cutting concern that affects both voice and silent modes:

- **Set by:** `mute_self` tool call or host toggle in dashboard
- **Stored in:** `metadata.muted: boolean`
- **Checked in:** Transcript webhook (before routing to either handler)
- **Cleared by:** Host unmute via `PATCH /api/meetings/[id]`
- **Voice behavior:** HTML page polls activation-status, sees `muted: true`, shows "Muted" status. Polling continues so unmute is detected.
- **Silent behavior:** Transcript webhook skips `handleSilentTranscript` when muted.

---

## Key Constants Reference

| Constant                | Value                    | File              |
| ----------------------- | ------------------------ | ----------------- |
| Voice wake words        | vernix, agent, assistant | activation.ts     |
| Voice debounce          | 1.5s                     | activation.ts     |
| Voice rate limit        | 15s                      | activation.ts     |
| Voice transcript window | 30s                      | activation.ts     |
| Silent trigger          | vernix                   | silent.ts         |
| Silent debounce         | 3s                       | silent.ts         |
| Silent rate limit       | 30s                      | silent.ts         |
| Silent response cap     | 500 chars                | response.ts       |
| Idle timeout            | 15s                      | voice-agent.html  |
| Fallback timeout        | 5s                       | voice-agent.html  |
| Poll interval           | 2s                       | voice-agent.html  |
| Audio buffer            | 10s                      | voice-agent.html  |
| MCP cache TTL           | 5 min                    | voice-token route |
| MCP server timeout      | 10s                      | mcp/client.ts     |
| RAG boost factor        | 1.15x                    | rag.ts            |
| RAG max results         | 10                       | rag.ts            |
| RAG max concurrent      | 5                        | rag.ts            |
