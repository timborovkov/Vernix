import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getMeetingBotProvider } from "@/lib/meeting-bot";
import { z } from "zod/v4";

const joinSchema = z.object({
  meetingId: z.uuid(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = joinSchema.safeParse(body);

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

  if (meeting.status !== "pending" && meeting.status !== "failed") {
    return NextResponse.json(
      { error: `Cannot join meeting with status: ${meeting.status}` },
      { status: 400 }
    );
  }

  await db
    .update(meetings)
    .set({ status: "joining", updatedAt: new Date() })
    .where(eq(meetings.id, meetingId));

  const provider = getMeetingBotProvider();

  try {
    const { botId } = await provider.joinMeeting(meeting.joinLink, meetingId);

    await db
      .update(meetings)
      .set({
        status: "active",
        startedAt: new Date(),
        metadata: { ...meeting.metadata, botId },
        updatedAt: new Date(),
      })
      .where(eq(meetings.id, meetingId));

    return NextResponse.json({ success: true, botId });
  } catch (error) {
    console.error("Failed to join meeting:", error);

    await db
      .update(meetings)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(meetings.id, meetingId));

    return NextResponse.json(
      {
        error: "Failed to join meeting",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
