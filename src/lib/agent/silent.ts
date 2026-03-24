import { getOpenAIClient } from "@/lib/openai/client";
import { getRAGContext, formatContextForPrompt } from "@/lib/agent/rag";
import { getSilentAgentSystemPrompt } from "@/lib/agent/prompts";
import { getMeetingBotProvider } from "@/lib/meeting-bot";
import { rateLimit } from "@/lib/rate-limit";

const TRIGGER_KEYWORDS = ["kivikova", "kivi kova", "kivi-kova"];
const DEBOUNCE_MS = 3000;
const RATE_LIMIT_INTERVAL_MS = 30_000;
const MAX_RESPONSE_LENGTH = 500;

export function containsMention(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGER_KEYWORDS.some((kw) => lower.includes(kw));
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

async function generateSilentResponse(
  meetingId: string,
  userId: string,
  recentTranscript: string,
  agenda?: string | null
): Promise<string> {
  let ragContext = "";
  try {
    const results = await getRAGContext(recentTranscript, {
      userId,
      boostMeetingId: meetingId,
    });
    ragContext = formatContextForPrompt(results);
  } catch (err) {
    console.warn(
      "[Silent Agent] RAG search failed, proceeding without context:",
      err
    );
  }

  const systemPrompt = getSilentAgentSystemPrompt(agenda);

  const userMessage = ragContext
    ? `Recent meeting transcript:\n${recentTranscript}\n\nRelevant context:\n${ragContext}`
    : `Recent meeting transcript:\n${recentTranscript}`;

  const openai = getOpenAIClient();
  const completion = await openai.chat.completions.create({
    model: "gpt-5.4-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    max_tokens: 200,
    temperature: 0.7,
  });

  const response = completion.choices[0]?.message?.content ?? "";
  return response.slice(0, MAX_RESPONSE_LENGTH);
}

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
  // from participants whose display names contain "KiviKova" (e.g. "KiviKova Support")
  const spokenText = chunks.map((c) => c.text).join("\n");
  if (!containsMention(spokenText)) return;

  const rl = rateLimit(`silent-agent:${meetingId}`, {
    interval: RATE_LIMIT_INTERVAL_MS,
    limit: 1,
  });
  if (!rl.success) {
    console.log(`[Silent Agent] Rate limited for meeting ${meetingId}`);
    return;
  }

  try {
    const response = await generateSilentResponse(
      meetingId,
      userId,
      fullText,
      agenda
    );
    if (response) {
      await getMeetingBotProvider().sendChatMessage(botId, response);
      console.log(`[Silent Agent] Sent chat response for meeting ${meetingId}`);
    }
  } catch (err) {
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
