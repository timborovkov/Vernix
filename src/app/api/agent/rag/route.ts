import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  getRAGContext,
  formatContextForPrompt,
  MeetingNotFoundError,
  EmbeddingError,
} from "@/lib/agent/rag";
import { rateLimitByIp } from "@/lib/rate-limit";

const ragSchema = z.object({
  meetingId: z.uuid(),
  botSecret: z.string().min(1, "Bot secret is required"),
  query: z.string().min(1, "Query is required"),
});

export async function POST(request: Request) {
  const rl = rateLimitByIp(request, "agent:rag", {
    interval: 60_000,
    limit: 60,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ragSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { meetingId, botSecret, query } = parsed.data;

  // Look up meeting and verify bot secret
  const [meeting] = await db
    .select({ userId: meetings.userId, metadata: meetings.metadata })
    .from(meetings)
    .where(eq(meetings.id, meetingId));

  if (!meeting) {
    return NextResponse.json({ context: "Meeting not found." });
  }

  const storedSecret = (meeting.metadata as Record<string, unknown>)
    ?.voiceSecret;
  if (!storedSecret || storedSecret !== botSecret) {
    return NextResponse.json({ error: "Invalid bot secret" }, { status: 403 });
  }

  try {
    const results = await getRAGContext(query, {
      userId: meeting.userId!,
      boostMeetingId: meetingId,
    });
    const context =
      formatContextForPrompt(results) || "No relevant context found.";

    return NextResponse.json({ context });
  } catch (error) {
    if (error instanceof MeetingNotFoundError) {
      return NextResponse.json({ context: "Meeting not found." });
    }
    if (error instanceof EmbeddingError) {
      return NextResponse.json({ context: "Search unavailable." });
    }
    return NextResponse.json({ context: "Error searching context." });
  }
}
