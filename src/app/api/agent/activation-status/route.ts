import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { rateLimitByIp } from "@/lib/rate-limit";
import { verifyBotSecret } from "@/lib/agent/verify-bot-secret";
import type { VoiceActivation } from "@/lib/agent/activation";
import { recordSessionEnd } from "@/lib/agent/telemetry";

const activationStatusSchema = z.object({
  meetingId: z.uuid(),
  botSecret: z.string().min(1, "Bot secret is required"),
  // Optional: HTML page can update state
  state: z.enum(["responding", "cooldown", "idle"]).optional(),
  // Optional: session duration in ms (sent when transitioning to idle)
  sessionDurationMs: z.number().int().nonnegative().optional(),
});

export async function POST(request: Request) {
  const rl = rateLimitByIp(request, "agent:activation-status", {
    interval: 60_000,
    limit: 120,
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

  const parsed = activationStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const {
    meetingId,
    botSecret,
    state: newState,
    sessionDurationMs,
  } = parsed.data;

  const [meeting] = await db
    .select({ metadata: meetings.metadata, userId: meetings.userId })
    .from(meetings)
    .where(eq(meetings.id, meetingId));

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const metadata = (meeting.metadata ?? {}) as Record<string, unknown>;

  if (!verifyBotSecret(metadata, botSecret)) {
    return NextResponse.json({ error: "Invalid bot secret" }, { status: 403 });
  }

  if (!meeting.userId) {
    return NextResponse.json({ state: "idle", muted: false });
  }

  // If the HTML page is updating state, write it — but never overwrite
  // a pending "activated" state with "idle" (would clobber a wake-word trigger)
  if (newState) {
    const currentState = (
      metadata.voiceActivation as VoiceActivation | undefined
    )?.state;

    // Guard: don't let "idle" or "cooldown" overwrite a pending "activated"
    if (
      (newState === "idle" || newState === "cooldown") &&
      currentState === "activated"
    ) {
      console.log(
        `[Activation] Skipping ${newState} write — pending activation exists for ${meetingId}`
      );
      return NextResponse.json({
        state: "activated",
        muted: Boolean(metadata.muted),
      });
    }

    const activation: VoiceActivation = { state: newState };
    const updatedMetadata = { ...metadata, voiceActivation: activation };
    await db
      .update(meetings)
      .set({ metadata: updatedMetadata, updatedAt: new Date() })
      .where(
        and(eq(meetings.id, meetingId), eq(meetings.userId, meeting.userId))
      );

    // Record session end telemetry when transitioning to idle
    if (newState === "idle" && sessionDurationMs != null) {
      recordSessionEnd(meetingId, sessionDurationMs);
    }

    // Return the state we just wrote — no second DB read needed
    return NextResponse.json({
      state: newState,
      muted: Boolean(metadata.muted),
    });
  }

  // Read state from the metadata we already fetched
  const activation = metadata.voiceActivation as VoiceActivation | undefined;

  // If activated, atomically consume it by transitioning to "responding"
  // so a duplicate poll won't re-trigger activateSession.
  // The SQL condition ensures only the first concurrent poll succeeds.
  if (activation?.state === "activated") {
    console.log(
      `[Activation] Consuming activated state for ${meetingId} — client will connect`
    );
    const consumed: VoiceActivation = { state: "responding" };
    await db
      .update(meetings)
      .set({
        metadata: { ...metadata, voiceActivation: consumed },
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(meetings.id, meetingId),
          eq(meetings.userId, meeting.userId),
          sql`${meetings.metadata}->>'voiceActivation' IS NOT NULL AND (${meetings.metadata}->'voiceActivation'->>'state') = 'activated'`
        )
      );
  }

  return NextResponse.json({
    state: activation?.state ?? "idle",
    muted: Boolean(metadata.muted),
    transcriptWindow: activation?.transcriptWindow,
  });
}
