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

  console.log("[Webhook:status] Received:", JSON.stringify(body).slice(0, 300));

  const parsed = statusEventSchema.safeParse(body);
  if (!parsed.success) {
    console.log("[Webhook:status] Invalid payload");
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { event, data } = parsed.data;
  const botId = data.bot.id;
  console.log(`[Webhook:status] Event: ${event}, botId: ${botId}`);

  // bot.call_ended — set processing + endedAt (summary comes later on transcript.done)
  if (event === "bot.call_ended") {
    const [meeting] = await db
      .select()
      .from(meetings)
      .where(sql`${meetings.metadata}->>'botId' = ${botId}`);

    if (
      !meeting ||
      meeting.status === "completed" ||
      meeting.status === "failed"
    ) {
      return NextResponse.json({ skipped: true });
    }

    console.log(
      `[Webhook:status] bot.call_ended: setting meeting ${meeting.id} to processing`
    );
    await db
      .update(meetings)
      .set({
        status: "processing",
        endedAt: meeting.endedAt ?? new Date(),
        updatedAt: new Date(),
      })
      .where(eq(meetings.id, meeting.id));

    return NextResponse.json({ success: true });
  }

  // transcript.done — generate summary (transcripts should be in Qdrant by now)
  if (event === "transcript.done") {
    const [meeting] = await db
      .select()
      .from(meetings)
      .where(sql`${meetings.metadata}->>'botId' = ${botId}`);

    if (!meeting || meeting.status === "failed") {
      return NextResponse.json({ skipped: true });
    }

    console.log(
      `[Webhook:status] transcript.done for bot ${botId}, generating summary`
    );

    try {
      const segments = await scrollTranscript(meeting.qdrantCollectionName);
      console.log(
        `[Webhook:status] Found ${segments.length} segments for summary`
      );
      const summary = await generateMeetingSummary(segments, {
        title: meeting.title,
        startedAt: meeting.startedAt,
        participants: meeting.participants as string[],
      });
      const existingMetadata =
        (meeting.metadata as Record<string, unknown>) ?? {};

      await db
        .update(meetings)
        .set({
          status: "completed",
          endedAt: meeting.endedAt ?? new Date(),
          metadata: { ...existingMetadata, summary },
          updatedAt: new Date(),
        })
        .where(eq(meetings.id, meeting.id));

      console.log(
        `[Webhook:status] Summary generated for meeting ${meeting.id}`
      );
    } catch (error) {
      console.error("Summary generation failed on transcript.done:", error);
      await db
        .update(meetings)
        .set({
          status: "completed",
          endedAt: meeting.endedAt ?? new Date(),
          updatedAt: new Date(),
        })
        .where(eq(meetings.id, meeting.id));
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ skipped: true });
}
