import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getMeetingBotProvider } from "@/lib/meeting-bot";
import { requireSessionUser } from "@/lib/auth/session";
import { processMeetingEnd } from "@/lib/agent/processing";
import { z } from "zod/v4";

const stopSchema = z.object({
  meetingId: z.uuid(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = stopSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid meeting ID", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const { meetingId } = parsed.data;

  const [meeting] = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.userId, user.id)));

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const stoppable = ["active", "joining", "processing"];
  if (!stoppable.includes(meeting.status)) {
    return NextResponse.json(
      { error: `Cannot stop meeting with status: ${meeting.status}` },
      { status: 400 }
    );
  }

  // Only call leaveMeeting for active/joining (not for stuck processing recovery)
  if (meeting.status !== "processing") {
    const provider = getMeetingBotProvider();
    const botId = (meeting.metadata as Record<string, unknown>)?.botId as
      | string
      | undefined;

    if (botId) {
      try {
        await provider.leaveMeeting(botId);
      } catch (error) {
        // Bot may have already left/completed — continue with processing
        console.warn("leaveMeeting failed (bot may have already left):", error);
      }
    }
  }

  // Set processing status while generating summary
  await db
    .update(meetings)
    .set({
      status: "processing",
      endedAt: meeting.endedAt ?? new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(meetings.id, meetingId), eq(meetings.userId, user.id)));

  const existingMetadata = (meeting.metadata as Record<string, unknown>) ?? {};
  await processMeetingEnd(meetingId, user.id, meeting.qdrantCollectionName, {
    ...existingMetadata,
    title: meeting.title,
    startedAt: meeting.startedAt,
    endedAt: meeting.endedAt ?? new Date(),
    participants: (meeting.participants as string[]) ?? [],
  });

  return NextResponse.json({ success: true });
}
