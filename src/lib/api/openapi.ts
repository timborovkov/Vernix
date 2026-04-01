import { OpenApiBuilder } from "openapi3-ts/oas31";
import { RATE_LIMIT_STANDARD, RATE_LIMIT_EXPENSIVE } from "./constants";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://vernix.app";

// ---------------------------------------------------------------------------
// Build the OpenAPI 3.1 specification
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */

export function buildOpenApiSpec() {
  // Cast to `any` — openapi3-ts's OAS 3.1 types don't fully support `nullable`
  // but Scalar and other consumers handle it fine.
  const builder = OpenApiBuilder.create({
    openapi: "3.1.0",
    info: {
      title: "Vernix API",
      version: "1.0.0",
      description: `REST API for Vernix — the AI assistant that joins your video calls.
Create meetings, control the agent, search transcripts, manage tasks, and more.

## Authentication

All API requests require a valid API key passed in the \`Authorization\` header:

\`\`\`
Authorization: Bearer kk_your_api_key_here
\`\`\`

**Creating an API key:**
1. Go to [Settings → API Keys](${BASE_URL}/dashboard/settings) in your Vernix dashboard.
2. Click "Create API Key" and give it a name.
3. Copy the key — it is only shown once.

API access requires a **Pro plan**. Free plan users will receive a \`403 BILLING_LIMIT\` error.

**Rate limits:** ${RATE_LIMIT_STANDARD} requests/minute for standard endpoints, ${RATE_LIMIT_EXPENSIVE} requests/minute for expensive operations (search, join, stop, upload). Rate limit headers are included in every response:
- \`X-RateLimit-Limit\` — max requests per window
- \`X-RateLimit-Remaining\` — remaining requests
- \`X-API-Version\` — current API version (\`v1\`)

**Daily quota:** ${BASE_URL}/api/billing shows your remaining API requests for the day (Pro: 1000/day).

## MCP (Model Context Protocol)

Vernix exposes an [MCP server](https://modelcontextprotocol.io) that lets AI assistants (Claude Desktop, Cursor, etc.) interact with your meeting data directly.

**Setting up MCP:**
1. Create an API key in [Settings → API Keys](${BASE_URL}/dashboard/settings).
2. Configure your MCP client to connect to \`${BASE_URL}/api/mcp\` with your API key.
3. For **Claude Desktop**, add this to your config:

\`\`\`json
{
  "mcpServers": {
    "vernix": {
      "url": "${BASE_URL}/api/mcp",
      "headers": {
        "Authorization": "Bearer kk_your_api_key_here"
      }
    }
  }
}
\`\`\`

**Available MCP tools:**
- \`search_meetings\` — Search transcripts and knowledge base via vector similarity
- \`list_meetings\` — List your meetings with optional status filter
- \`get_meeting\` — Get meeting details including summary and agenda
- \`get_transcript\` — Get full transcript with speaker labels
- \`list_tasks\` — List action items across meetings
- \`create_task\` — Create a task for a specific meeting
- \`vernix_join_call\` — Create a meeting and join the agent to a call
- \`vernix_stop_call\` — Stop the agent and trigger post-meeting processing
- \`vernix_search_tasks\` — Search and filter tasks across meetings

## Quick Start: Zero to Meeting Summary

The full meeting lifecycle in 5 API calls:

1. **Create a meeting:** \`POST /meetings\` with \`title\` and \`joinLink\` (the video call URL). Optionally set \`"autoJoin": true\` to skip step 2.
2. **Join the agent:** \`POST /meetings/{id}/join\` — the agent joins the video call. Status: pending → joining → active.
3. **Let the meeting happen.** The agent transcribes in real time, responds to questions via voice or chat, and connects to your integrations.
4. **Stop the agent:** \`POST /meetings/{id}/stop\` — triggers summary generation and task extraction. Status: active → processing → completed.
5. **Get results:** \`GET /meetings/{id}\` for the summary, \`GET /meetings/{id}/transcript\` for the full transcript, \`GET /meetings/{id}/tasks\` for extracted action items.

**Meeting status lifecycle:** \`pending\` → \`joining\` → \`active\` → \`processing\` → \`completed\` (or \`failed\`).

**Shortcut:** \`POST /meetings\` with \`"autoJoin": true\` combines steps 1 and 2 into a single call.

**Search:** Once you have meetings, \`GET /search?q=your+question\` searches across all transcripts and knowledge base documents.

## Error Codes

All errors follow the format \`{ error: { code, message } }\`. Possible codes:

| Code | Status | Description |
|------|--------|-------------|
| \`UNAUTHORIZED\` | 401 | Missing or invalid API key |
| \`FORBIDDEN\` | 403 | Insufficient permissions |
| \`BILLING_LIMIT\` | 403 | Feature requires Pro plan |
| \`NOT_FOUND\` | 404 | Resource not found |
| \`CONFLICT\` | 409 | Invalid state transition |
| \`VALIDATION_ERROR\` | 400 | Invalid request parameters |
| \`RATE_LIMITED\` | 429 | Too many requests or daily quota exceeded |
| \`INTERNAL_ERROR\` | 500 | Server error |

## Pagination

List endpoints use cursor-based pagination. Pass \`limit\` (1-100, default 20) and \`cursor\` (opaque string from previous response). The response includes a \`meta\` object with \`hasMore\` and \`nextCursor\`.
`,
      contact: { url: `${BASE_URL}/contact` },
    },
    servers: [{ url: `${BASE_URL}/api/v1`, description: "Production" }],
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description:
            "API key authentication. Create a key at Settings → API Keys. " +
            "Pass it as `Authorization: Bearer kk_...`",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: {
                code: { type: "string", example: "NOT_FOUND" },
                message: { type: "string", example: "Meeting not found" },
                issues: { type: "array", items: { type: "object" } },
              },
              required: ["code", "message"],
            },
          },
          required: ["error"],
        },
        PaginationMeta: {
          type: "object",
          properties: {
            hasMore: { type: "boolean" },
            nextCursor: { type: "string" },
          },
          required: ["hasMore"],
        },
        Meeting: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            title: { type: "string" },
            joinLink: { type: "string", format: "uri" },
            status: {
              type: "string",
              enum: [
                "pending",
                "joining",
                "active",
                "processing",
                "completed",
                "failed",
              ],
            },
            participants: { type: "array", items: { type: "string" } },
            metadata: { type: "object" },
            qdrantCollectionName: { type: "string" },
            startedAt: { type: "string", format: "date-time", nullable: true },
            endedAt: { type: "string", format: "date-time", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Task: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            meetingId: { type: "string", format: "uuid" },
            title: { type: "string" },
            assignee: { type: "string", nullable: true },
            status: { type: "string", enum: ["open", "completed"] },
            sourceText: { type: "string", nullable: true },
            sourceTimestampMs: { type: "number", nullable: true },
            dueDate: { type: "string", format: "date-time", nullable: true },
            autoExtracted: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            meetingTitle: { type: "string", nullable: true },
          },
        },
        Document: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            fileName: { type: "string" },
            fileType: { type: "string" },
            fileSize: { type: "number" },
            status: {
              type: "string",
              enum: ["processing", "ready", "failed"],
            },
            meetingId: { type: "string", format: "uuid", nullable: true },
            chunkCount: { type: "number", nullable: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        SearchResult: {
          type: "object",
          properties: {
            text: { type: "string" },
            score: { type: "number" },
            source: { type: "string", enum: ["transcript", "document"] },
            speaker: { type: "string" },
            timestamp_ms: { type: "number" },
            meetingId: { type: "string", format: "uuid" },
            fileName: { type: "string" },
            documentId: { type: "string", format: "uuid" },
          },
          required: ["text", "score", "source"],
        },
        TranscriptSegment: {
          type: "object",
          properties: {
            speaker: { type: "string" },
            text: { type: "string" },
            timestamp_ms: { type: "number" },
          },
        },
      },
      parameters: {
        limit: {
          name: "limit",
          in: "query",
          schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          description: "Number of items per page",
        },
        cursor: {
          name: "cursor",
          in: "query",
          schema: { type: "string" },
          description: "Opaque cursor for pagination",
        },
      },
    },
    paths: {
      // ---------------------------------------------------------------
      // Meetings
      // ---------------------------------------------------------------
      "/meetings": {
        get: {
          operationId: "listMeetings",
          summary: "List meetings",
          tags: ["Meetings"],
          parameters: [
            { $ref: "#/components/parameters/limit" },
            { $ref: "#/components/parameters/cursor" },
            {
              name: "status",
              in: "query",
              schema: {
                type: "string",
                enum: [
                  "pending",
                  "joining",
                  "active",
                  "processing",
                  "completed",
                  "failed",
                ],
              },
            },
          ],
          responses: {
            "200": {
              description: "Paginated list of meetings",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Meeting" },
                      },
                      meta: { $ref: "#/components/schemas/PaginationMeta" },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/schemas/Error" },
          },
        },
        post: {
          operationId: "createMeeting",
          summary: "Create a meeting",
          tags: ["Meetings"],
          description:
            "Creates a new meeting. Set `autoJoin: true` to immediately join the agent to the call.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    title: { type: "string", minLength: 1 },
                    joinLink: { type: "string", format: "uri" },
                    agenda: { type: "string", maxLength: 10000 },
                    silent: { type: "boolean", default: false },
                    noRecording: { type: "boolean", default: false },
                    autoJoin: {
                      type: "boolean",
                      default: false,
                      description:
                        "If true, the agent will automatically join the call after creation",
                    },
                  },
                  required: ["title", "joinLink"],
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Meeting created",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/Meeting" },
                    },
                  },
                },
              },
            },
          },
        },
      },

      "/meetings/{id}": {
        get: {
          operationId: "getMeeting",
          summary: "Get meeting details",
          tags: ["Meetings"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": {
              description: "Meeting details",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/Meeting" },
                    },
                  },
                },
              },
            },
            "404": { description: "Meeting not found" },
          },
        },
        patch: {
          operationId: "updateMeeting",
          summary: "Update meeting",
          tags: ["Meetings"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    joinLink: { type: "string", format: "uri" },
                    agenda: { type: "string" },
                    silent: { type: "boolean" },
                    muted: { type: "boolean" },
                    noRecording: { type: "boolean" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Updated meeting",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/Meeting" },
                    },
                  },
                },
              },
            },
          },
        },
        delete: {
          operationId: "deleteMeeting",
          summary: "Delete meeting",
          tags: ["Meetings"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": {
              description: "Meeting deleted",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "object",
                        properties: { deleted: { type: "boolean" } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },

      // ---------------------------------------------------------------
      // Agent Control
      // ---------------------------------------------------------------
      "/meetings/{id}/join": {
        post: {
          operationId: "joinMeeting",
          summary: "Join agent to a meeting",
          tags: ["Agent"],
          description:
            "Starts the Vernix agent in the specified meeting. The meeting must be in `pending` or `failed` status.",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": {
              description: "Agent joined",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "object",
                        properties: {
                          botId: { type: "string" },
                          status: { type: "string", example: "active" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "409": { description: "Meeting is not in a joinable state" },
          },
        },
      },

      "/meetings/{id}/stop": {
        post: {
          operationId: "stopMeeting",
          summary: "Stop agent and process meeting",
          tags: ["Agent"],
          description:
            "Stops the agent, triggers summary generation and task extraction.",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": {
              description: "Agent stopped, processing started",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "object",
                        properties: {
                          status: { type: "string", example: "processing" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "409": { description: "Meeting is not in a stoppable state" },
          },
        },
      },

      // ---------------------------------------------------------------
      // Transcript
      // ---------------------------------------------------------------
      "/meetings/{id}/transcript": {
        get: {
          operationId: "getTranscript",
          summary: "Get meeting transcript",
          tags: ["Meetings"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": {
              description: "Transcript segments",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "object",
                        properties: {
                          segments: {
                            type: "array",
                            items: {
                              $ref: "#/components/schemas/TranscriptSegment",
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },

      // ---------------------------------------------------------------
      // Tasks
      // ---------------------------------------------------------------
      "/meetings/{id}/tasks": {
        get: {
          operationId: "listMeetingTasks",
          summary: "List tasks for a meeting",
          tags: ["Tasks"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
            { $ref: "#/components/parameters/limit" },
            { $ref: "#/components/parameters/cursor" },
            {
              name: "status",
              in: "query",
              schema: { type: "string", enum: ["open", "completed"] },
            },
          ],
          responses: {
            "200": {
              description: "Paginated task list",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Task" },
                      },
                      meta: { $ref: "#/components/schemas/PaginationMeta" },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          operationId: "createTask",
          summary: "Create a task",
          tags: ["Tasks"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    title: { type: "string", minLength: 1, maxLength: 500 },
                    assignee: { type: "string", maxLength: 200 },
                  },
                  required: ["title"],
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Task created",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/Task" },
                    },
                  },
                },
              },
            },
          },
        },
      },

      "/tasks": {
        get: {
          operationId: "listTasks",
          summary: "List all tasks",
          tags: ["Tasks"],
          parameters: [
            { $ref: "#/components/parameters/limit" },
            { $ref: "#/components/parameters/cursor" },
            {
              name: "status",
              in: "query",
              schema: { type: "string", enum: ["open", "completed"] },
            },
          ],
          responses: {
            "200": {
              description: "Paginated task list across all meetings",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Task" },
                      },
                      meta: { $ref: "#/components/schemas/PaginationMeta" },
                    },
                  },
                },
              },
            },
          },
        },
      },

      "/tasks/{id}": {
        get: {
          operationId: "getTask",
          summary: "Get task details",
          tags: ["Tasks"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": {
              description: "Task details",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/Task" },
                    },
                  },
                },
              },
            },
          },
        },
        patch: {
          operationId: "updateTask",
          summary: "Update a task",
          tags: ["Tasks"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    title: { type: "string", minLength: 1, maxLength: 500 },
                    assignee: {
                      type: "string",
                      maxLength: 200,
                      nullable: true,
                    },
                    status: {
                      type: "string",
                      enum: ["open", "completed"],
                    },
                    dueDate: {
                      type: "string",
                      format: "date-time",
                      nullable: true,
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Updated task",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/Task" },
                    },
                  },
                },
              },
            },
          },
        },
      },

      // ---------------------------------------------------------------
      // Search
      // ---------------------------------------------------------------
      "/search": {
        get: {
          operationId: "search",
          summary: "Semantic search",
          tags: ["Search"],
          description:
            "Search across meeting transcripts and knowledge base using vector similarity.",
          parameters: [
            {
              name: "q",
              in: "query",
              required: true,
              schema: { type: "string", minLength: 1 },
              description: "Search query",
            },
            {
              name: "meetingId",
              in: "query",
              schema: { type: "string", format: "uuid" },
              description: "Scope search to a specific meeting",
            },
            {
              name: "limit",
              in: "query",
              schema: {
                type: "integer",
                minimum: 1,
                maximum: 50,
                default: 10,
              },
            },
          ],
          responses: {
            "200": {
              description: "Search results",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/SearchResult" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },

      // ---------------------------------------------------------------
      // Knowledge Base
      // ---------------------------------------------------------------
      "/knowledge": {
        get: {
          operationId: "listDocuments",
          summary: "List documents",
          tags: ["Knowledge Base"],
          parameters: [
            { $ref: "#/components/parameters/limit" },
            { $ref: "#/components/parameters/cursor" },
            {
              name: "meetingId",
              in: "query",
              schema: { type: "string", format: "uuid" },
              description: "Filter by meeting",
            },
          ],
          responses: {
            "200": {
              description: "Paginated document list",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Document" },
                      },
                      meta: { $ref: "#/components/schemas/PaginationMeta" },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          operationId: "uploadDocument",
          summary: "Upload a document",
          tags: ["Knowledge Base"],
          description:
            "Upload a PDF, DOCX, TXT, or MD file. Optionally scope it to a meeting.",
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  properties: {
                    file: { type: "string", format: "binary" },
                    meetingId: { type: "string", format: "uuid" },
                  },
                  required: ["file"],
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Document uploaded",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/Document" },
                    },
                  },
                },
              },
            },
          },
        },
      },

      "/knowledge/{id}": {
        get: {
          operationId: "getDocument",
          summary: "Get document details",
          tags: ["Knowledge Base"],
          description: "Returns document metadata and a signed download URL.",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": {
              description: "Document details with download URL",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        allOf: [
                          { $ref: "#/components/schemas/Document" },
                          {
                            type: "object",
                            properties: {
                              downloadUrl: { type: "string", format: "uri" },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        },
        delete: {
          operationId: "deleteDocument",
          summary: "Delete a document",
          tags: ["Knowledge Base"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": {
              description: "Document deleted",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "object",
                        properties: { deleted: { type: "boolean" } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },

      // ---------------------------------------------------------------
      // Integrations
      // ---------------------------------------------------------------
      "/integrations": {
        get: {
          operationId: "listIntegrations",
          summary: "List connected integrations",
          tags: ["Integrations"],
          description:
            "Returns the user's connected integrations (Slack, Linear, GitHub, etc.) with their catalog metadata.",
          responses: {
            "200": {
              description: "List of connected integrations",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string", format: "uuid" },
                            name: { type: "string" },
                            enabled: { type: "boolean" },
                            catalogIntegrationId: {
                              type: "string",
                              nullable: true,
                            },
                            integrationName: {
                              type: "string",
                              nullable: true,
                            },
                            integrationCategory: {
                              type: "string",
                              nullable: true,
                            },
                            integrationLogo: {
                              type: "string",
                              nullable: true,
                            },
                            createdAt: {
                              type: "string",
                              format: "date-time",
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  } as any);

  return builder.getSpec();
}
