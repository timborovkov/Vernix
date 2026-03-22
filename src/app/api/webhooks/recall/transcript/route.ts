import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { upsertTranscriptChunk } from "@/lib/vector/upsert";

const recallTranscriptSchema = z.object({
  bot_id: z.string().min(1),
  transcript: z.object({
    original_transcript_id: z.number(),
    speaker: z.string(),
    speaker_id: z.number(),
    words: z.array(
      z.object({
        text: z.string(),
        start_time: z.number(),
        end_time: z.number(),
      })
    ),
    is_final: z.boolean(),
    language: z.string().optional(),
  }),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = recallTranscriptSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { bot_id: botId, transcript } = parsed.data;

  if (!transcript.is_final || transcript.words.length === 0) {
    return NextResponse.json({ skipped: true });
  }

  const [meeting] = await db
    .select()
    .from(meetings)
    .where(sql`${meetings.metadata}->>'botId' = ${botId}`);

  if (!meeting) {
    return NextResponse.json(
      { error: "Meeting not found for bot" },
      { status: 404 }
    );
  }

  if (meeting.status !== "active") {
    return NextResponse.json(
      { error: `Meeting is not active, current status: ${meeting.status}` },
      { status: 400 }
    );
  }

  const text = transcript.words.map((w) => w.text).join(" ");
  const timestampMs = Math.round(transcript.words[0].start_time * 1000);

  try {
    await upsertTranscriptChunk(meeting.qdrantCollectionName, {
      text,
      speaker: transcript.speaker,
      timestampMs,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to process transcript",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }

  // Atomically add speaker to participants (best-effort, don't fail the request)
  try {
    await db
      .update(meetings)
      .set({
        participants: sql`
          CASE
            WHEN NOT (COALESCE(${meetings.participants}, '[]'::jsonb) @> ${JSON.stringify([transcript.speaker])}::jsonb)
            THEN (COALESCE(${meetings.participants}, '[]'::jsonb) || ${JSON.stringify([transcript.speaker])}::jsonb)
            ELSE COALESCE(${meetings.participants}, '[]'::jsonb)
          END
        `,
        updatedAt: new Date(),
      })
      .where(eq(meetings.id, meeting.id));
  } catch (error) {
    console.error("Failed to update participants:", error);
  }

  return NextResponse.json({ success: true });
}
