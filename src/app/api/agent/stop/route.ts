import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getMeetingBotProvider } from "@/lib/meeting-bot";
import { requireSessionUser } from "@/lib/auth/session";
import { scrollTranscript } from "@/lib/vector/scroll";
import { generateMeetingSummary } from "@/lib/summary/generate";
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

  // Generate summary (best-effort)
  try {
    const segments = await scrollTranscript(meeting.qdrantCollectionName);
    const existingMetadata =
      (meeting.metadata as Record<string, unknown>) ?? {};
    const summary = await generateMeetingSummary(segments, {
      title: meeting.title,
      startedAt: meeting.startedAt,
      participants: meeting.participants as string[],
      agenda: existingMetadata.agenda as string | undefined,
    });

    await db
      .update(meetings)
      .set({
        status: "completed",
        metadata: { ...existingMetadata, summary },
        updatedAt: new Date(),
      })
      .where(and(eq(meetings.id, meetingId), eq(meetings.userId, user.id)));
  } catch (error) {
    console.error("Post-processing failed:", error);
    // Still complete on failure, just without summary
    await db
      .update(meetings)
      .set({ status: "completed", updatedAt: new Date() })
      .where(and(eq(meetings.id, meetingId), eq(meetings.userId, user.id)));
  }

  return NextResponse.json({ success: true });
}
