import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { rateLimitByIp } from "@/lib/rate-limit";
import { verifyBotSecret } from "@/lib/agent/verify-bot-secret";
import { getOpenAIClient } from "@/lib/openai/client";
import {
  containsVoiceMention,
  getRecentTranscriptWindow,
  type VoiceActivation,
} from "@/lib/agent/activation";
import { recordActivation, recordWakeDetectCall } from "@/lib/agent/telemetry";

const MAX_AUDIO_SIZE = 500_000; // ~500KB base64, ~375KB raw audio (~11s at 16kHz)

const wakeDetectSchema = z.object({
  meetingId: z.uuid(),
  botSecret: z.string().min(1, "Bot secret is required"),
  audio: z.string().min(1).max(MAX_AUDIO_SIZE),
});

export async function POST(request: Request) {
  const rl = rateLimitByIp(request, "agent:wake-detect", {
    interval: 60_000,
    limit: 60,
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

  const parsed = wakeDetectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { meetingId, botSecret, audio } = parsed.data;

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
    return NextResponse.json({ activated: false });
  }

  // Check if already activated or responding — skip transcription
  const currentActivation = metadata.voiceActivation as
    | VoiceActivation
    | undefined;
  if (
    currentActivation?.state === "activated" ||
    currentActivation?.state === "responding"
  ) {
    return NextResponse.json({ activated: false });
  }

  // Decode base64 audio and transcribe
  let transcribedText: string;
  try {
    const audioBuffer = Buffer.from(audio, "base64");
    const audioFile = new File([audioBuffer], "audio.wav", {
      type: "audio/wav",
    });

    const openai = getOpenAIClient();
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "gpt-4o-mini-transcribe",
      language: "en",
    });

    transcribedText = transcription.text;
    recordWakeDetectCall(meetingId);
  } catch (err) {
    console.error("[Wake Detect] Transcription failed:", err);
    return NextResponse.json({ activated: false });
  }

  if (!transcribedText || !containsVoiceMention(transcribedText)) {
    return NextResponse.json({ activated: false });
  }

  // Wake word detected — activate
  console.log(
    `[Wake Detect] Wake word found in "${transcribedText.slice(0, 80)}" for meeting ${meetingId}`
  );

  // Build transcript window: recent meeting transcript + the transcribed audio
  // This gives the model context from before the wake word was spoken
  const recentTranscript = getRecentTranscriptWindow(meetingId);
  const transcriptWindow = recentTranscript
    ? `${recentTranscript}\n${transcribedText}`
    : transcribedText;

  const activation: VoiceActivation = {
    state: "activated",
    activatedAt: Date.now(),
    transcriptWindow,
  };

  await db
    .update(meetings)
    .set({
      metadata: { ...metadata, voiceActivation: activation },
      updatedAt: new Date(),
    })
    .where(
      and(eq(meetings.id, meetingId), eq(meetings.userId, meeting.userId))
    );

  recordActivation(meetingId);

  return NextResponse.json({
    activated: true,
    transcriptWindow,
  });
}
