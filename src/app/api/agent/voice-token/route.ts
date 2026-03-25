import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getOpenAIClient } from "@/lib/openai/client";
import {
  getVoiceAgentSystemPrompt,
  type ToolDescription,
} from "@/lib/agent/prompts";
import { McpClientManager } from "@/lib/mcp/client";
import { rateLimitByIp } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = rateLimitByIp(request, "agent:voice-token", {
    interval: 60_000,
    limit: 10,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const meetingId = searchParams.get("meetingId");

  const botSecret = searchParams.get("botSecret");

  if (!meetingId || !botSecret) {
    return NextResponse.json(
      { error: "meetingId and botSecret are required" },
      { status: 400 }
    );
  }

  const [meeting] = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.status, "active")));

  if (!meeting) {
    return NextResponse.json(
      { error: "Meeting not found or not active" },
      { status: 404 }
    );
  }

  // Verify the bot secret matches the stored voiceSecret
  const storedSecret = (meeting.metadata as Record<string, unknown>)
    ?.voiceSecret;
  if (typeof storedSecret !== "string" || storedSecret !== botSecret) {
    return NextResponse.json({ error: "Invalid bot secret" }, { status: 403 });
  }

  if (!meeting.userId) {
    return NextResponse.json(
      { error: "Meeting not found or not active" },
      { status: 404 }
    );
  }

  // Load MCP tools for the meeting owner (with timeout so voice agent isn't blocked)
  const MCP_TIMEOUT_MS = 5_000;
  let mcpOpenAITools: Array<{
    type: "function";
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }> = [];
  let mcpToolDescriptions: ToolDescription[] = [];
  try {
    const mcpManager = await Promise.race([
      McpClientManager.connectForUser(meeting.userId),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("MCP connection timeout")),
          MCP_TIMEOUT_MS
        )
      ),
    ]);
    mcpOpenAITools = mcpManager.getOpenAITools();
    mcpToolDescriptions = mcpOpenAITools.map((t) => ({
      name: t.name,
      description: t.description,
    }));
  } catch (error) {
    console.error("MCP client connection failed:", error);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const agendaRaw = (meeting.metadata as Record<string, unknown>)?.agenda;
  const agenda = typeof agendaRaw === "string" ? agendaRaw : undefined;

  try {
    const client = getOpenAIClient();
    const secret = await client.realtime.clientSecrets.create({
      session: {
        type: "realtime",
        model: "gpt-realtime-1.5",
        instructions: getVoiceAgentSystemPrompt(agenda, mcpToolDescriptions),
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
          ...mcpOpenAITools,
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
      mcpToolNames: mcpOpenAITools.map((t) => t.name),
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
