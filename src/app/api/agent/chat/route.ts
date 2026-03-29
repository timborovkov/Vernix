import { NextResponse } from "next/server";
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth/session";
import { requireLimits, billingError } from "@/lib/billing/enforce";
import { canMakeRagQuery } from "@/lib/billing/limits";
import { getDailyCount, recordUsageEvent } from "@/lib/billing/usage";
import { getRAGContext, formatContextForPrompt } from "@/lib/agent/rag";
import {
  getAgentSystemPrompt,
  type ToolDescription,
} from "@/lib/agent/prompts";
import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { McpClientManager } from "@/lib/mcp/client";

export async function POST(request: Request) {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  // Billing check
  const { limits } = await requireLimits(user.id);
  const dailyRag = await getDailyCount(user.id, "rag_query");
  const ragCheck = canMakeRagQuery(limits, dailyRag);
  if (!ragCheck.allowed) return billingError(ragCheck, 429);

  const { messages, meetingId } = await request.json();
  recordUsageEvent(user.id, "rag_query").catch((e) =>
    console.error("[Billing] Usage recording failed:", e)
  );

  // Fetch agenda if scoped to a meeting
  let agenda: string | null = null;
  if (meetingId) {
    const [meeting] = await db
      .select({ metadata: meetings.metadata })
      .from(meetings)
      .where(and(eq(meetings.id, meetingId), eq(meetings.userId, user.id)));
    agenda =
      ((meeting?.metadata as Record<string, unknown>)?.agenda as string) ??
      null;
  }

  // Connect to user's external MCP servers (cached, non-blocking on failure)
  let mcpTools: Record<string, unknown> = {};
  let mcpToolDescriptions: ToolDescription[] = [];
  try {
    const mcpManager = await McpClientManager.connectForUser(user.id);
    mcpTools = mcpManager.getVercelTools();
    mcpToolDescriptions = Object.entries(mcpTools).map(([name, tool]) => ({
      name,
      description: (tool as { description: string }).description,
    }));
  } catch (error) {
    console.error("MCP client connection failed:", error);
  }

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: openai("gpt-5.4"),
    system: getAgentSystemPrompt(agenda, mcpToolDescriptions),
    messages: modelMessages,
    tools: {
      ...mcpTools,
      searchMeetingContext: {
        description:
          "Search current and past meeting transcripts for relevant context to answer questions about meetings.",
        inputSchema: z.object({
          query: z.string().describe("The search query"),
        }),
        execute: async ({ query }) => {
          const results = await getRAGContext(query, {
            userId: user.id,
            ...(meetingId ? { meetingId, boostMeetingId: meetingId } : {}),
          });
          return {
            context:
              formatContextForPrompt(results) || "No relevant context found.",
            sources: results.map((r) => ({
              text: r.text,
              score: r.score,
              source: r.source,
              speaker: r.speaker,
              timestampMs: r.timestampMs,
              fileName: r.fileName,
            })),
          };
        },
      },
    },
    stopWhen: stepCountIs(10),
  });

  return result.toUIMessageStreamResponse();
}
