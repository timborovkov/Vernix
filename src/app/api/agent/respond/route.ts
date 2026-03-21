import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { getOpenAIClient } from "@/lib/openai/client";
import {
  getRAGContext,
  formatContextForPrompt,
  MeetingNotFoundError,
} from "@/lib/agent/rag";
import { AGENT_SYSTEM_PROMPT } from "@/lib/agent/prompts";

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

  const { meetingId, question } = parsed.data;

  try {
    const ragResults = await getRAGContext(question, { meetingId });
    const contextString = formatContextForPrompt(ragResults);

    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: contextString
            ? `${AGENT_SYSTEM_PROMPT}\n\n${contextString}`
            : AGENT_SYSTEM_PROMPT,
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
