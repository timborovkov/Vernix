import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { upsertTranscriptChunk } from "@/lib/vector/upsert";
import { verifyRecallSignature } from "@/lib/webhooks/verify";
import { rateLimitByIp } from "@/lib/rate-limit";

// New format (recording_config / realtime_endpoints)
const newTranscriptSchema = z.object({
  event: z.literal("transcript.data"),
  data: z.object({
    data: z.object({
      words: z.array(
        z.object({
          text: z.string(),
          start_timestamp: z.object({ relative: z.number() }),
          end_timestamp: z
            .object({ relative: z.number() })
            .nullable()
            .optional(),
        })
      ),
      participant: z.object({
        id: z.number(),
        name: z.string().nullable(),
      }),
    }),
    bot: z.object({
      id: z.string(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }),
  }),
});

// Legacy format (transcription_options / real_time_transcription)
const legacyTranscriptSchema = z.object({
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

interface NormalizedTranscript {
  botId: string;
  speaker: string;
  text: string;
  timestampMs: number;
}

function parsePayload(body: unknown): NormalizedTranscript | "skip" | null {
  // Try new format first
  const newParsed = newTranscriptSchema.safeParse(body);
  if (newParsed.success) {
    const { data, bot } = newParsed.data.data;
    if (data.words.length === 0) return "skip";

    return {
      botId: bot.id,
      // Null participant name = the bot itself (human participants always have names)
      speaker: data.participant.name ?? "Vernix Agent",
      text: data.words.map((w) => w.text).join(" "),
      timestampMs: Math.round(data.words[0].start_timestamp.relative * 1000),
    };
  }

  // Try legacy format
  const legacyParsed = legacyTranscriptSchema.safeParse(body);
  if (legacyParsed.success) {
    const { bot_id: botId, transcript } = legacyParsed.data;
    if (!transcript.is_final || transcript.words.length === 0) return "skip";

    return {
      botId,
      speaker: transcript.speaker,
      text: transcript.words.map((w) => w.text).join(" "),
      timestampMs: Math.round(transcript.words[0].start_time * 1000),
    };
  }

  return null;
}

export async function POST(request: Request) {
  const rl = rateLimitByIp(request, "webhook:transcript", {
    interval: 60_000,
    limit: 100,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const webhookSecret = process.env.RECALL_WEBHOOK_SECRET;
  let body: unknown;

  if (webhookSecret) {
    const { valid, body: rawBody } = await verifyRecallSignature(
      request,
      webhookSecret
    );
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      );
    }
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
  } else {
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
  }

  console.log(
    "[Webhook:transcript] Received payload:",
    JSON.stringify(body).slice(0, 500)
  );

  const result = parsePayload(body);

  if (result === null) {
    console.log("[Webhook:transcript] Payload did not match any schema");
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (result === "skip") {
    console.log("[Webhook:transcript] Skipped (empty/non-final)");
    return NextResponse.json({ skipped: true });
  }

  const { botId, speaker, text, timestampMs } = result;
  console.log(
    `[Webhook:transcript] Parsed: botId=${botId}, speaker=${speaker}, text="${text.slice(0, 80)}..."`
  );

  const [meeting] = await db
    .select()
    .from(meetings)
    .where(sql`${meetings.metadata}->>'botId' = ${botId}`);

  if (!meeting) {
    console.log(`[Webhook:transcript] No meeting found for botId=${botId}`);
    return NextResponse.json(
      { error: "Meeting not found for bot" },
      { status: 404 }
    );
  }

  // Accept transcripts for active, processing, and completed meetings
  // (Recall may deliver transcript data after the call ends)
  const acceptableStatuses = ["active", "processing", "completed"];
  if (!acceptableStatuses.includes(meeting.status)) {
    console.log(
      `[Webhook:transcript] Meeting ${meeting.id} status ${meeting.status} not acceptable`
    );
    return NextResponse.json(
      { error: `Meeting status ${meeting.status} does not accept transcripts` },
      { status: 400 }
    );
  }

  try {
    await upsertTranscriptChunk(meeting.qdrantCollectionName, {
      text,
      speaker,
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
            WHEN NOT (COALESCE(${meetings.participants}, '[]'::jsonb) @> ${JSON.stringify([speaker])}::jsonb)
            THEN (COALESCE(${meetings.participants}, '[]'::jsonb) || ${JSON.stringify([speaker])}::jsonb)
            ELSE COALESCE(${meetings.participants}, '[]'::jsonb)
          END
        `,
        updatedAt: new Date(),
      })
      .where(eq(meetings.id, meeting.id));
  } catch (error) {
    console.error("Failed to update participants:", error);
  }

  // Silent agent: monitor transcript for mentions and respond via meeting chat
  const metadata = (meeting.metadata ?? {}) as Record<string, unknown>;
  if (
    metadata.silent &&
    meeting.status === "active" &&
    meeting.userId &&
    typeof metadata.botId === "string" &&
    speaker !== "Vernix Agent"
  ) {
    const userId = meeting.userId;
    const botId = metadata.botId;
    import("@/lib/agent/silent")
      .then(({ handleSilentTranscript }) =>
        handleSilentTranscript(
          meeting.id,
          userId,
          botId,
          speaker,
          text,
          timestampMs,
          (metadata.agenda as string) ?? null
        )
      )
      .catch((err) => console.error("[Silent Agent] Error:", err));
  }

  return NextResponse.json({ success: true });
}
