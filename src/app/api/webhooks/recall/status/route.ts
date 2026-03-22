import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { scrollTranscript } from "@/lib/vector/scroll";
import { generateMeetingSummary } from "@/lib/summary/generate";

const statusEventSchema = z.object({
  event: z.string(),
  data: z.object({
    bot: z.object({
      id: z.string(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }),
  }),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = statusEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { event, data } = parsed.data;
  const botId = data.bot.id;

  // Only handle call ended events
  if (event !== "bot.call_ended") {
    return NextResponse.json({ skipped: true });
  }

  const [meeting] = await db
    .select()
    .from(meetings)
    .where(sql`${meetings.metadata}->>'botId' = ${botId}`);

  if (!meeting) {
    return NextResponse.json({ skipped: true });
  }

  // Only process if meeting is still in an active state
  if (!["active", "joining"].includes(meeting.status)) {
    return NextResponse.json({ skipped: true });
  }

  // Set processing and generate summary
  await db
    .update(meetings)
    .set({
      status: "processing",
      endedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(meetings.id, meeting.id));

  try {
    const segments = await scrollTranscript(meeting.qdrantCollectionName);
    const summary = await generateMeetingSummary(segments);
    const existingMetadata =
      (meeting.metadata as Record<string, unknown>) ?? {};

    await db
      .update(meetings)
      .set({
        status: "completed",
        metadata: { ...existingMetadata, summary },
        updatedAt: new Date(),
      })
      .where(eq(meetings.id, meeting.id));
  } catch (error) {
    console.error("Post-processing failed on bot.call_ended:", error);
    await db
      .update(meetings)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(meetings.id, meeting.id));
  }

  return NextResponse.json({ success: true });
}
