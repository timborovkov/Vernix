import { getMeetingBotProvider } from "@/lib/meeting-bot";
import { rateLimit, resetRateLimitKey } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { processMeetingEnd } from "@/lib/agent/processing";
import { generateAgentResponse } from "@/lib/agent/response";
import { WAKE_WORDS } from "@/lib/agent/activation";
const DEBOUNCE_MS = 3000;
const RATE_LIMIT_INTERVAL_MS = 30_000;

export function containsMention(text: string): boolean {
  const lower = text.toLowerCase();
  return WAKE_WORDS.some((kw) => lower.includes(kw));
}

interface BufferedChunk {
  speaker: string;
  text: string;
  timestampMs: number;
}

interface TranscriptBuffer {
  chunks: BufferedChunk[];
  timer: ReturnType<typeof setTimeout> | null;
}

const buffers = new Map<string, TranscriptBuffer>();

async function flushBuffer(
  meetingId: string,
  userId: string,
  botId: string,
  agenda?: string | null
): Promise<void> {
  const buffer = buffers.get(meetingId);
  if (!buffer || buffer.chunks.length === 0) return;

  const chunks = [...buffer.chunks];
  // Remove the entry entirely — chunks are consumed and timer has already fired
  // eslint-disable-next-line drizzle/enforce-delete-with-where -- Map.delete, not Drizzle
  buffers.delete(meetingId);

  const fullText = chunks.map((c) => `${c.speaker}: ${c.text}`).join("\n");

  // Only check spoken text — not speaker name prefixes — to avoid false positives
  // from participants whose display names contain "Vernix" (e.g. "Vernix Support")
  const spokenText = chunks.map((c) => c.text).join("\n");
  if (!containsMention(spokenText)) return;

  // Consume the rate-limit slot optimistically to prevent concurrent flushes
  // from both sending a response. If delivery fails, release the slot so the
  // next mention can retry rather than being silently suppressed.
  const rateLimitKey = `silent-agent:${meetingId}`;
  const rl = rateLimit(rateLimitKey, {
    interval: RATE_LIMIT_INTERVAL_MS,
    limit: 1,
  });
  if (!rl.success) {
    console.log(`[Silent Agent] Rate limited for meeting ${meetingId}`);
    return;
  }

  try {
    const result = await generateAgentResponse(
      meetingId,
      userId,
      fullText,
      agenda
    );
    if (result.text) {
      await getMeetingBotProvider().sendChatMessage(botId, result.text);
      console.log(`[Silent Agent] Sent chat response for meeting ${meetingId}`);
    } else {
      // Empty response — release the slot so future mentions can be answered
      resetRateLimitKey(rateLimitKey);
    }

    // Fetch meeting for mute/leave actions
    if (result.mute || result.leave) {
      const [meeting] = await db
        .select()
        .from(meetings)
        .where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId)));

      // Handle mute_self tool call (skip if also leaving)
      if (result.mute && !result.leave && meeting) {
        console.log(`[Silent Agent] Muting for meeting ${meetingId}`);
        const metadata = (meeting.metadata as Record<string, unknown>) ?? {};
        await db
          .update(meetings)
          .set({
            metadata: { ...metadata, muted: true },
            updatedAt: new Date(),
          })
          .where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId)));
      }

      // Handle leave_meeting tool call
      if (result.leave && meeting) {
        console.log(`[Silent Agent] Leaving meeting ${meetingId}`);
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

        const metadata = (meeting.metadata as Record<string, unknown>) ?? {};
        await processMeetingEnd(
          meetingId,
          userId,
          meeting.qdrantCollectionName,
          {
            ...metadata,
            title: meeting.title,
            startedAt: meeting.startedAt,
            participants: (meeting.participants as string[]) ?? [],
          }
        );
      }
    }
  } catch (err) {
    // Release the slot so the next mention can retry
    resetRateLimitKey(rateLimitKey);
    console.error("[Silent Agent] Failed to generate or send response:", err);
  }
}

export function handleSilentTranscript(
  meetingId: string,
  userId: string,
  botId: string,
  speaker: string,
  text: string,
  timestampMs: number,
  agenda?: string | null
): void {
  let buffer = buffers.get(meetingId);
  if (!buffer) {
    buffer = { chunks: [], timer: null };
    buffers.set(meetingId, buffer);
  }

  buffer.chunks.push({ speaker, text, timestampMs });

  if (buffer.timer) {
    clearTimeout(buffer.timer);
  }

  buffer.timer = setTimeout(() => {
    flushBuffer(meetingId, userId, botId, agenda).catch((err) =>
      console.error("[Silent Agent] Flush error:", err)
    );
  }, DEBOUNCE_MS);
}

/** Clear all buffers (for testing). */
export function resetSilentBuffers(): void {
  for (const buffer of buffers.values()) {
    if (buffer.timer) clearTimeout(buffer.timer);
  }
  buffers.clear();
}
