import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { rateLimitByIp } from "@/lib/rate-limit";
import { verifyBotSecret } from "@/lib/agent/verify-bot-secret";
import { generateAgentResponse } from "@/lib/agent/response";
import { getMeetingBotProvider } from "@/lib/meeting-bot";
import { processMeetingEnd } from "@/lib/agent/processing";

const fallbackSchema = z.object({
  meetingId: z.uuid(),
  botSecret: z.string().min(1, "Bot secret is required"),
  transcriptWindow: z.string().min(1, "Transcript context is required"),
});

export async function POST(request: Request) {
  const rl = rateLimitByIp(request, "agent:voice-fallback", {
    interval: 60_000,
    limit: 30,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = fallbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { meetingId, botSecret, transcriptWindow } = parsed.data;

  const [meetingAuth] = await db
    .select({
      userId: meetings.userId,
      metadata: meetings.metadata,
    })
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.status, "active")));

  if (!meetingAuth) {
    return NextResponse.json(
      { error: "Meeting not found or not active" },
      { status: 404 }
    );
  }

  const metadata = (meetingAuth.metadata ?? {}) as Record<string, unknown>;

  if (!verifyBotSecret(metadata, botSecret)) {
    return NextResponse.json({ error: "Invalid bot secret" }, { status: 403 });
  }

  const userId = meetingAuth.userId;
  if (!userId) {
    return NextResponse.json(
      { error: "Meeting has no owner" },
      { status: 404 }
    );
  }

  // Scope full record fetch by userId after bot-secret verification.
  const [meeting] = await db
    .select()
    .from(meetings)
    .where(
      and(
        eq(meetings.id, meetingId),
        eq(meetings.status, "active"),
        eq(meetings.userId, userId)
      )
    );

  if (!meeting) {
    return NextResponse.json(
      { error: "Meeting not found or not active" },
      { status: 404 }
    );
  }

  const agenda =
    typeof metadata.agenda === "string" ? metadata.agenda : undefined;
  const botId = typeof metadata.botId === "string" ? metadata.botId : null;

  try {
    const result = await generateAgentResponse(
      meetingId,
      userId,
      transcriptWindow,
      agenda
    );

    if (result.text && botId) {
      await getMeetingBotProvider().sendChatMessage(botId, result.text);
      console.log(
        `[Voice Fallback] Sent chat response for meeting ${meetingId}`
      );
    }

    // Handle leave_meeting tool call
    if (result.leave && botId) {
      const provider = getMeetingBotProvider();
      try {
        await provider.leaveMeeting(botId);
      } catch (leaveErr) {
        console.warn("leaveMeeting failed:", leaveErr);
      }
      await db
        .update(meetings)
        .set({
          status: "processing",
          endedAt: meeting.endedAt ?? new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId)));
      await processMeetingEnd(meetingId, userId, meeting.qdrantCollectionName, {
        ...metadata,
        title: meeting.title,
        startedAt: meeting.startedAt,
        participants: (meeting.participants as string[]) ?? [],
      });
    }

    // Handle mute_self tool call
    if (result.mute && !result.leave) {
      await db
        .update(meetings)
        .set({
          metadata: { ...metadata, muted: true },
          updatedAt: new Date(),
        })
        .where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId)));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    console.error("[Voice Fallback] Failed:", detail, err);
    return NextResponse.json(
      { error: "Failed to generate fallback response", detail },
      { status: 500 }
    );
  }
}
