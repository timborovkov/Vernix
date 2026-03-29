import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { Webhook } from "svix";
import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { processMeetingEnd } from "@/lib/agent/processing";
import { rateLimitByIp } from "@/lib/rate-limit";
import { flushTelemetry } from "@/lib/agent/telemetry";
import { clearMcpToolCache } from "@/lib/agent/mcp-cache";

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
  let rawBody: string;

  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (webhookSecret) {
    // Recall uses Svix for webhook delivery (accepts both header naming conventions)
    const svixId =
      request.headers.get("svix-id") ?? request.headers.get("webhook-id");
    const svixTimestamp =
      request.headers.get("svix-timestamp") ??
      request.headers.get("webhook-timestamp");
    const svixSignature =
      request.headers.get("svix-signature") ??
      request.headers.get("webhook-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json(
        { error: "Missing webhook signature headers" },
        { status: 401 }
      );
    }

    try {
      const wh = new Webhook(webhookSecret);
      body = wh.verify(rawBody, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      });
    } catch {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      );
    }
  } else {
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
  }

  console.log("[Webhook:status] Received:", JSON.stringify(body).slice(0, 300));

  const parsed = statusEventSchema.safeParse(body);
  if (!parsed.success) {
    // Return 200 for events we don't understand — Recall sends many event types
    // and we only handle a subset. Returning non-200 causes Recall to retry.
    console.log("[Webhook:status] Unhandled event format, acknowledging");
    return NextResponse.json({ skipped: true });
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

    // Flush voice telemetry and clear MCP cache
    if (meeting.userId) {
      flushTelemetry(meeting.id, meeting.userId).catch((err) =>
        console.error("[Webhook:status] Telemetry flush failed:", err)
      );
    }
    clearMcpToolCache(meeting.id);

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
          endedAt: meeting.endedAt ?? new Date(),
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
