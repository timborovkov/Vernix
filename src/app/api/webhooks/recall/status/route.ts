import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { processMeetingEnd } from "@/lib/agent/processing";
import { verifyRecallSignature } from "@/lib/webhooks/verify";
import { rateLimitByIp } from "@/lib/rate-limit";

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
  const rl = rateLimitByIp(request, "webhook:status", {
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
      meeting.status === "failed" ||
      meeting.status === "processing"
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

    if (
      !meeting ||
      meeting.status === "failed" ||
      meeting.status === "completed"
    ) {
      return NextResponse.json({ skipped: true });
    }

    console.log(
      `[Webhook:status] transcript.done for bot ${botId}, generating summary`
    );

    if (meeting.userId) {
      // Ensure endedAt is set before processing
      if (!meeting.endedAt) {
        await db
          .update(meetings)
          .set({ endedAt: new Date(), updatedAt: new Date() })
          .where(eq(meetings.id, meeting.id));
      }

      const existingMetadata =
        (meeting.metadata as Record<string, unknown>) ?? {};
      await processMeetingEnd(
        meeting.id,
        meeting.userId,
        meeting.qdrantCollectionName,
        {
          ...existingMetadata,
          title: meeting.title,
          startedAt: meeting.startedAt,
          participants: (meeting.participants as string[]) ?? [],
        }
      );

      console.log(
        `[Webhook:status] Summary generated for meeting ${meeting.id}`
      );
    } else {
      // No userId — can't generate summary, but still mark completed
      await db
        .update(meetings)
        .set({
          status: "completed",
          endedAt: meeting.endedAt ?? new Date(),
          updatedAt: new Date(),
        })
        .where(eq(meetings.id, meeting.id));
      console.warn(
        `[Webhook:status] Meeting ${meeting.id} has no userId, skipping summary`
      );
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ skipped: true });
}
