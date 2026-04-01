import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db } from "@/lib/db";
import { meetings, tasks, users } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { formatContextForPrompt } from "@/lib/agent/rag";
import { scrollTranscript } from "@/lib/vector/scroll";
import { createMeeting } from "@/lib/services/meetings";
import { joinMeeting, stopMeeting } from "@/lib/services/agent";
import { searchMeetings } from "@/lib/services/search";
import { listTasks } from "@/lib/services/tasks";
import { listConnectedIntegrations } from "@/lib/services/integrations";

/**
 * Create an MCP server instance scoped to a specific user.
 * Each connection gets its own server with userId baked into every query.
 */
export function createMcpServer(userId: string): McpServer {
  const server = new McpServer({
    name: "Vernix",
    version: "1.0.0",
  });

  // -----------------------------------------------------------------------
  // Core tools (read-only data access)
  // -----------------------------------------------------------------------

  server.registerTool(
    "search_meetings",
    {
      description:
        "Search across meeting transcripts and knowledge base using vector similarity",
      inputSchema: {
        query: z.string(),
        meetingId: z.string().optional(),
        limit: z.number().optional(),
      },
    },
    async ({ query, meetingId, limit }) => {
      try {
        const results = await searchMeetings(userId, {
          query,
          meetingId,
          limit: limit ?? 10,
        });
        if (results.length === 0) {
          return {
            content: [
              { type: "text" as const, text: "No relevant context found." },
            ],
          };
        }
        return {
          content: [
            {
              type: "text" as const,
              text: formatContextForPrompt(
                results.map((r) => ({
                  text: r.text,
                  score: r.score,
                  source: r.source as "transcript" | "document",
                  speaker: r.speaker,
                  timestampMs: r.timestamp_ms,
                  meetingId: r.meetingId,
                  fileName: r.fileName,
                  documentId: r.documentId,
                }))
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "list_meetings",
    {
      description: "List user's meetings with optional status filter",
      inputSchema: {
        status: z
          .enum([
            "pending",
            "joining",
            "active",
            "processing",
            "completed",
            "failed",
          ])
          .optional(),
      },
    },
    async ({ status }) => {
      const conditions = [eq(meetings.userId, userId)];
      if (status) conditions.push(eq(meetings.status, status));

      const result = await db
        .select({
          id: meetings.id,
          title: meetings.title,
          status: meetings.status,
          startedAt: meetings.startedAt,
          endedAt: meetings.endedAt,
          participants: meetings.participants,
          createdAt: meetings.createdAt,
        })
        .from(meetings)
        .where(and(...conditions))
        .orderBy(desc(meetings.createdAt))
        .limit(100);

      return {
        content: [
          { type: "text" as const, text: JSON.stringify(result, null, 2) },
        ],
      };
    }
  );

  server.registerTool(
    "get_meeting",
    {
      description: "Get meeting details including summary and agenda",
      inputSchema: { meetingId: z.string() },
    },
    async ({ meetingId }) => {
      const [meeting] = await db
        .select()
        .from(meetings)
        .where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId)));

      if (!meeting) {
        return {
          content: [{ type: "text" as const, text: "Meeting not found." }],
          isError: true,
        };
      }

      const metadata = (meeting.metadata ?? {}) as Record<string, unknown>;
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                id: meeting.id,
                title: meeting.title,
                status: meeting.status,
                startedAt: meeting.startedAt,
                endedAt: meeting.endedAt,
                participants: meeting.participants,
                summary: metadata.summary ?? null,
                agenda: metadata.agenda ?? null,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "get_transcript",
    {
      description: "Get the full transcript for a meeting",
      inputSchema: { meetingId: z.string() },
    },
    async ({ meetingId }) => {
      const [meeting] = await db
        .select({ qdrantCollectionName: meetings.qdrantCollectionName })
        .from(meetings)
        .where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId)));

      if (!meeting) {
        return {
          content: [{ type: "text" as const, text: "Meeting not found." }],
          isError: true,
        };
      }

      const segments = await scrollTranscript(meeting.qdrantCollectionName);
      const text = segments
        .map((s) => `[${s.speaker}] (${s.timestampMs}ms): ${s.text}`)
        .join("\n");

      return {
        content: [
          { type: "text" as const, text: text || "No transcript available." },
        ],
      };
    }
  );

  server.registerTool(
    "list_tasks",
    {
      description:
        "List action items / tasks, optionally filtered by meeting or status",
      inputSchema: {
        meetingId: z.string().optional(),
        status: z.enum(["open", "completed"]).optional(),
      },
    },
    async ({ meetingId, status }) => {
      const conditions = [eq(tasks.userId, userId)];
      if (meetingId) conditions.push(eq(tasks.meetingId, meetingId));
      if (status) conditions.push(eq(tasks.status, status));

      const result = await db
        .select()
        .from(tasks)
        .where(and(...conditions))
        .orderBy(desc(tasks.createdAt))
        .limit(100);

      return {
        content: [
          { type: "text" as const, text: JSON.stringify(result, null, 2) },
        ],
      };
    }
  );

  server.registerTool(
    "create_task",
    {
      description: "Create a new task / action item for a meeting",
      inputSchema: {
        meetingId: z.string(),
        title: z.string().min(1).max(500),
        assignee: z.string().max(200).optional(),
      },
    },
    async ({ meetingId, title, assignee }) => {
      // Verify meeting ownership
      const [meeting] = await db
        .select({ id: meetings.id })
        .from(meetings)
        .where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId)));

      if (!meeting) {
        return {
          content: [{ type: "text" as const, text: "Meeting not found." }],
          isError: true,
        };
      }

      const [task] = await db
        .insert(tasks)
        .values({
          meetingId,
          userId,
          title,
          assignee: assignee ?? null,
        })
        .returning();

      return {
        content: [
          { type: "text" as const, text: JSON.stringify(task, null, 2) },
        ],
      };
    }
  );

  // -----------------------------------------------------------------------
  // Agent control tools
  // -----------------------------------------------------------------------

  server.registerTool(
    "vernix_join_call",
    {
      description:
        "Create a new meeting and immediately join the Vernix agent to the call. Returns the meeting details and agent status.",
      inputSchema: {
        title: z.string().min(1).describe("Meeting title"),
        joinLink: z
          .string()
          .url()
          .describe("Video call URL (Zoom, Meet, Teams, Webex)"),
        agenda: z.string().max(10000).optional().describe("Meeting agenda"),
        silent: z
          .boolean()
          .optional()
          .describe("If true, use text-only silent mode instead of voice"),
      },
    },
    async ({ title, joinLink, agenda, silent }) => {
      try {
        // Fetch user name for bot display
        const [user] = await db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, userId));

        const meeting = await createMeeting(userId, {
          title,
          joinLink,
          agenda,
          silent,
        });

        try {
          const result = await joinMeeting(
            userId,
            meeting.id,
            user?.name ?? undefined,
            { skipBillingCheck: true }
          );
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    meetingId: meeting.id,
                    title: meeting.title,
                    botId: result.botId,
                    status: result.status,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (joinError) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Meeting created (${meeting.id}) but agent failed to join: ${joinError instanceof Error ? joinError.message : "Unknown error"}`,
              },
            ],
            isError: true,
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to create meeting: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "vernix_stop_call",
    {
      description:
        "Stop the Vernix agent in an active meeting and trigger post-meeting processing (summary generation, task extraction).",
      inputSchema: {
        meetingId: z.string().describe("The meeting ID to stop"),
      },
    },
    async ({ meetingId }) => {
      try {
        const result = await stopMeeting(userId, meetingId);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { meetingId, status: result.status },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to stop meeting: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // -----------------------------------------------------------------------
  // Search tools (use service layer for billing + RAG)
  // -----------------------------------------------------------------------

  server.registerTool(
    "vernix_search_meetings",
    {
      description:
        "Semantic search across all meeting transcripts and knowledge base documents using vector similarity. Returns relevant text snippets with source information.",
      inputSchema: {
        query: z.string().describe("Natural language search query"),
        meetingId: z
          .string()
          .optional()
          .describe("Scope search to a specific meeting"),
        limit: z.number().optional().describe("Max results (1-50, default 10)"),
      },
    },
    async ({ query, meetingId, limit }) => {
      try {
        const results = await searchMeetings(userId, {
          query,
          meetingId,
          limit,
        });
        return {
          content: [
            {
              type: "text" as const,
              text:
                results.length > 0
                  ? JSON.stringify(results, null, 2)
                  : "No relevant results found.",
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "vernix_search_tasks",
    {
      description:
        "Search and filter tasks across all meetings. Filter by status (open/completed) or meeting.",
      inputSchema: {
        meetingId: z.string().optional().describe("Filter by meeting ID"),
        status: z
          .enum(["open", "completed"])
          .optional()
          .describe("Filter by status"),
        limit: z
          .number()
          .optional()
          .describe("Max results (1-100, default 20)"),
      },
    },
    async ({ meetingId, status, limit }) => {
      try {
        const result = await listTasks(userId, {
          meetingId,
          status,
          limit: limit ?? 20,
        });
        return {
          content: [
            {
              type: "text" as const,
              text:
                result.data.length > 0
                  ? JSON.stringify(result.data, null, 2)
                  : "No tasks found matching the criteria.",
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to search tasks: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // -----------------------------------------------------------------------
  // Integrations
  // -----------------------------------------------------------------------

  server.registerTool(
    "list_integrations",
    {
      description:
        "List the user's connected integrations (Slack, Linear, GitHub, etc.) with their status and category.",
      inputSchema: {},
    },
    async () => {
      try {
        const integrations = await listConnectedIntegrations(userId);
        return {
          content: [
            {
              type: "text" as const,
              text:
                integrations.length > 0
                  ? JSON.stringify(integrations, null, 2)
                  : "No integrations connected. Connect integrations at Settings → Integrations.",
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to list integrations: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  return server;
}
