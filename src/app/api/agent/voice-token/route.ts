import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getOpenAIClient } from "@/lib/openai/client";
import { AGENT_SYSTEM_PROMPT } from "@/lib/agent/prompts";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const meetingId = searchParams.get("meetingId");

  if (!meetingId) {
    return NextResponse.json(
      { error: "meetingId is required" },
      { status: 400 }
    );
  }

  const [meeting] = await db
    .select()
    .from(meetings)
    .where(eq(meetings.id, meetingId));

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const client = getOpenAIClient();
    const secret = await client.realtime.clientSecrets.create({
      session: {
        type: "realtime",
        model: "gpt-4o-realtime-preview",
        instructions: AGENT_SYSTEM_PROMPT,
        tools: [
          {
            type: "function",
            name: "search_meeting_context",
            description:
              "Search current and past meeting transcripts for relevant context to answer questions.",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "The search query",
                },
              },
              required: ["query"],
            },
          },
        ],
        tool_choice: "auto",
        audio: {
          input: {
            format: { type: "audio/pcm", rate: 24000 },
            noise_reduction: { type: "far_field" },
            turn_detection: {
              type: "semantic_vad",
              eagerness: "low",
              create_response: true,
              interrupt_response: true,
            },
          },
          output: {
            format: { type: "audio/pcm", rate: 24000 },
            voice: "cedar",
          },
        },
      },
    });

    return NextResponse.json({
      token: secret.value,
      expiresAt: secret.expires_at,
      ragUrl: `${appUrl}/api/agent/rag`,
      meetingId,
    });
  } catch (error) {
    console.error("Failed to create voice token:", error);
    return NextResponse.json(
      { error: "Failed to create voice session" },
      { status: 500 }
    );
  }
}
