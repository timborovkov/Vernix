import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getMeetingBotProvider } from "@/lib/meeting-bot";
import { processMeetingEnd } from "@/lib/agent/processing";
import { rateLimitByIp } from "@/lib/rate-limit";

const leaveSchema = z.object({
  meetingId: z.uuid(),
  botSecret: z.string().min(1, "Bot secret is required"),
});

export async function POST(request: Request) {
  const rl = rateLimitByIp(request, "agent:leave", {
    interval: 60_000,
    limit: 5,
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

  const parsed = leaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { meetingId, botSecret } = parsed.data;

  const [meeting] = await db
    .select()
    .from(meetings)
    .where(eq(meetings.id, meetingId));

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  // Verify bot secret — accept voiceSecret (voice mode) or botId (silent mode)
  const metadata = (meeting.metadata ?? {}) as Record<string, unknown>;
  const storedVoiceSecret = metadata.voiceSecret;
  const storedBotId = metadata.botId;

  const validVoiceSecret =
    typeof storedVoiceSecret === "string" && storedVoiceSecret === botSecret;
  const validBotId =
    typeof storedBotId === "string" && storedBotId === botSecret;

  if (!validVoiceSecret && !validBotId) {
    return NextResponse.json({ error: "Invalid bot secret" }, { status: 403 });
  }

  if (!meeting.userId) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const stoppable = ["active", "joining"];
  if (!stoppable.includes(meeting.status)) {
    return NextResponse.json(
      { error: `Cannot leave meeting with status: ${meeting.status}` },
      { status: 400 }
    );
  }

  // Leave the call
  const botId = typeof storedBotId === "string" ? storedBotId : undefined;
  if (botId) {
    const provider = getMeetingBotProvider();
    try {
      await provider.leaveMeeting(botId);
    } catch (error) {
      console.warn("leaveMeeting failed (bot may have already left):", error);
    }
  }

  // Set processing status
  await db
    .update(meetings)
    .set({
      status: "processing",
      endedAt: meeting.endedAt ?? new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(eq(meetings.id, meetingId), eq(meetings.userId, meeting.userId))
    );

  // Generate summary and extract tasks
  await processMeetingEnd(
    meetingId,
    meeting.userId,
    meeting.qdrantCollectionName,
    {
      ...metadata,
      title: meeting.title,
      startedAt: meeting.startedAt,
      participants: (meeting.participants as string[]) ?? [],
    }
  );

  return NextResponse.json({ success: true });
}
