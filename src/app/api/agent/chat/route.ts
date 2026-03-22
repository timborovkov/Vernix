import { NextResponse } from "next/server";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth/session";
import { getRAGContext, formatContextForPrompt } from "@/lib/agent/rag";
import { AGENT_SYSTEM_PROMPT } from "@/lib/agent/prompts";

export async function POST(request: Request) {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const { messages, meetingId } = await request.json();

  const result = streamText({
    model: openai("gpt-4o"),
    system: AGENT_SYSTEM_PROMPT,
    messages,
    tools: {
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
              speaker: r.speaker,
              timestampMs: r.timestampMs,
              score: r.score,
            })),
          };
        },
      },
    },
  });

  return result.toTextStreamResponse();
}
