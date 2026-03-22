import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { z } from "zod/v4";
import { getOpenAIClient } from "@/lib/openai/client";
import {
  getRAGContext,
  formatContextForPrompt,
  MeetingNotFoundError,
} from "@/lib/agent/rag";
import { getAgentSystemPrompt } from "@/lib/agent/prompts";
import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

const respondSchema = z.object({
  meetingId: z.uuid(),
  question: z.string().min(1, "Question is required"),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = respondSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const { meetingId, question } = parsed.data;

  // Ownership is validated by getRAGContext (MeetingNotFoundError if not found)
  // The middleware already ensures the user is authenticated
  try {
    const ragResults = await getRAGContext(question, {
      meetingId,
      userId: user.id,
    });
    const contextString = formatContextForPrompt(ragResults);

    // Fetch agenda for the meeting
    const [meeting] = await db
      .select({ metadata: meetings.metadata })
      .from(meetings)
      .where(and(eq(meetings.id, meetingId), eq(meetings.userId, user.id)));
    const agenda = (meeting?.metadata as Record<string, unknown>)?.agenda as
      | string
      | undefined;
    const systemPrompt = getAgentSystemPrompt(agenda);

    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: contextString
            ? `${systemPrompt}\n\n${contextString}`
            : systemPrompt,
        },
        { role: "user", content: question },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    });

    return NextResponse.json({
      answer: completion.choices[0].message.content,
      sources: ragResults,
    });
  } catch (error) {
    if (error instanceof MeetingNotFoundError) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }
    return NextResponse.json(
      {
        error: "Failed to generate response",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
