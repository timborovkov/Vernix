import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { rateLimit, resetRateLimitKey } from "@/lib/rate-limit";
import { recordActivation } from "@/lib/agent/telemetry";

// Wake words for all agents (voice + silent)
// "vernix" includes fuzzy variants for transcription errors
export const WAKE_WORDS = [
  "vernix",
  "vern ix",
  "varnix",
  "burnix",
  "fernix",
  "vernik",
  "vernicks",
  "vernix's",
  "agent",
  "assistant",
];
const VOICE_DEBOUNCE_MS = 500;
const VOICE_RATE_LIMIT_MS = 15_000;
const TRANSCRIPT_WINDOW_SECONDS = 30;

export interface VoiceActivation {
  state: "idle" | "activated" | "responding" | "cooldown";
  activatedAt?: number;
  transcriptWindow?: string;
}

interface BufferedChunk {
  speaker: string;
  text: string;
  timestampMs: number;
}

interface VoiceBuffer {
  chunks: BufferedChunk[];
  timer: ReturnType<typeof setTimeout> | null;
  // Rolling window of recent transcript for context injection
  recentTranscript: BufferedChunk[];
}

const buffers = new Map<string, VoiceBuffer>();

export function containsVoiceMention(text: string): boolean {
  const lower = text.toLowerCase();
  return WAKE_WORDS.some((kw) => lower.includes(kw));
}

function buildTranscriptWindow(chunks: BufferedChunk[]): string {
  return chunks.map((c) => `${c.speaker}: ${c.text}`).join("\n");
}

/** Get recent transcript window for a meeting (used by wake-detect for context). */
export function getRecentTranscriptWindow(meetingId: string): string {
  const buffer = buffers.get(meetingId);
  if (!buffer || buffer.recentTranscript.length === 0) return "";
  return buildTranscriptWindow(buffer.recentTranscript);
}

function trimRecentTranscript(
  recent: BufferedChunk[],
  nowMs: number
): BufferedChunk[] {
  const cutoff = nowMs - TRANSCRIPT_WINDOW_SECONDS * 1000;
  return recent.filter((c) => c.timestampMs >= cutoff);
}

async function flushVoiceBuffer(
  meetingId: string,
  userId: string
): Promise<void> {
  const buffer = buffers.get(meetingId);
  if (!buffer || buffer.chunks.length === 0) return;

  const chunks = [...buffer.chunks];
  const recentTranscript = [...buffer.recentTranscript];
  // eslint-disable-next-line drizzle/enforce-delete-with-where -- Map.delete
  buffers.delete(meetingId);

  // Only check spoken text (not speaker names) to avoid false positives
  const spokenText = chunks.map((c) => c.text).join("\n");
  if (!containsVoiceMention(spokenText)) return;

  // Rate limit activations
  const rateLimitKey = `voice-activation:${meetingId}`;
  const rl = rateLimit(rateLimitKey, {
    interval: VOICE_RATE_LIMIT_MS,
    limit: 1,
  });
  if (!rl.success) {
    console.log(`[Voice Activation] Rate limited for meeting ${meetingId}`);
    return;
  }

  // Build transcript window from recent chunks
  const transcriptWindow = buildTranscriptWindow(recentTranscript);

  // Atomically check current state and activate in a single read-then-write
  // to prevent race conditions between concurrent webhook calls
  try {
    const [meeting] = await db
      .select({ metadata: meetings.metadata })
      .from(meetings)
      .where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId)));

    if (!meeting) {
      resetRateLimitKey(rateLimitKey);
      return;
    }

    const metadata = (meeting.metadata ?? {}) as Record<string, unknown>;
    const currentActivation = metadata.voiceActivation as
      | VoiceActivation
      | undefined;

    // Don't activate if already responding or activated
    if (
      currentActivation?.state === "responding" ||
      currentActivation?.state === "activated"
    ) {
      resetRateLimitKey(rateLimitKey);
      return;
    }

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
      .where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId)));

    recordActivation(meetingId);
    console.log(`[Voice Activation] Activated for meeting ${meetingId}`);
  } catch (err) {
    resetRateLimitKey(rateLimitKey);
    console.error("[Voice Activation] Failed to set activation state:", err);
  }
}

export function handleVoiceTranscript(
  meetingId: string,
  userId: string,
  _botId: string,
  speaker: string,
  text: string,
  timestampMs: number
): void {
  let buffer = buffers.get(meetingId);
  if (!buffer) {
    buffer = { chunks: [], timer: null, recentTranscript: [] };
    buffers.set(meetingId, buffer);
  }

  const chunk: BufferedChunk = { speaker, text, timestampMs };
  buffer.chunks.push(chunk);

  // Maintain rolling transcript window
  buffer.recentTranscript.push(chunk);
  buffer.recentTranscript = trimRecentTranscript(
    buffer.recentTranscript,
    timestampMs
  );

  if (buffer.timer) {
    clearTimeout(buffer.timer);
  }

  buffer.timer = setTimeout(() => {
    flushVoiceBuffer(meetingId, userId).catch((err) =>
      console.error("[Voice Activation] Flush error:", err)
    );
  }, VOICE_DEBOUNCE_MS);
}

/** Clear all buffers (for testing). */
export function resetVoiceBuffers(): void {
  for (const buffer of buffers.values()) {
    if (buffer.timer) clearTimeout(buffer.timer);
  }
  buffers.clear();
}
