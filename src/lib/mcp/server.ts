import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db } from "@/lib/db";
import { meetings, tasks } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getRAGContext, formatContextForPrompt } from "@/lib/agent/rag";
import { scrollTranscript } from "@/lib/vector/scroll";

/**
 * Create an MCP server instance scoped to a specific user.
 * Each connection gets its own server with userId baked into every query.
 */
export function createMcpServer(userId: string): McpServer {
  const server = new McpServer({
    name: "Vernix",
    version: "1.0.0",
  });

  server.tool(
    "search_meetings",
    "Search across meeting transcripts and knowledge base using vector similarity",
    {
      query: z.string(),
      meetingId: z.string().optional(),
      limit: z.number().optional(),
    },
    async ({ query, meetingId, limit }) => {
      const results = await getRAGContext(query, {
        userId,
        meetingId,
        limit: limit ?? 10,
        ...(meetingId ? { boostMeetingId: meetingId } : {}),
      });
      return {
        content: [
          {
            type: "text" as const,
            text:
              formatContextForPrompt(results) || "No relevant context found.",
          },
        ],
      };
    }
  );

  server.tool(
    "list_meetings",
    "List user's meetings with optional status filter",
    {
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
        .orderBy(desc(meetings.createdAt));

      return {
        content: [
          { type: "text" as const, text: JSON.stringify(result, null, 2) },
        ],
      };
    }
  );

  server.tool(
    "get_meeting",
    "Get meeting details including summary and agenda",
    { meetingId: z.string() },
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

  server.tool(
    "get_transcript",
    "Get the full transcript for a meeting",
    { meetingId: z.string() },
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

  server.tool(
    "list_tasks",
    "List action items / tasks, optionally filtered by meeting or status",
    {
      meetingId: z.string().optional(),
      status: z.enum(["open", "completed"]).optional(),
    },
    async ({ meetingId, status }) => {
      const conditions = [eq(tasks.userId, userId)];
      if (meetingId) conditions.push(eq(tasks.meetingId, meetingId));
      if (status) conditions.push(eq(tasks.status, status));

      const result = await db
        .select()
        .from(tasks)
        .where(and(...conditions))
        .orderBy(desc(tasks.createdAt));

      return {
        content: [
          { type: "text" as const, text: JSON.stringify(result, null, 2) },
        ],
      };
    }
  );

  server.tool(
    "create_task",
    "Create a new task / action item for a meeting",
    {
      meetingId: z.string(),
      title: z.string().min(1).max(500),
      assignee: z.string().max(200).optional(),
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

  return server;
}
