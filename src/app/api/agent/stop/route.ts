import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getMeetingBotProvider } from "@/lib/meeting-bot";
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

  const { meetingId } = parsed.data;

  const [meeting] = await db
    .select()
    .from(meetings)
    .where(eq(meetings.id, meetingId));

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  if (meeting.status !== "active" && meeting.status !== "joining") {
    return NextResponse.json(
      { error: `Cannot stop meeting with status: ${meeting.status}` },
      { status: 400 }
    );
  }

  const provider = getMeetingBotProvider();
  const botId = (meeting.metadata as Record<string, unknown>)?.botId as
    | string
    | undefined;

  if (botId) {
    await provider.leaveMeeting(botId);
  }

  await db
    .update(meetings)
    .set({
      status: "completed",
      endedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(meetings.id, meetingId));

  return NextResponse.json({ success: true });
}
