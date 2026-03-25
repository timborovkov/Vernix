import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { getOpenAIClient } from "@/lib/openai/client";
import { getRAGContext, formatContextForPrompt } from "@/lib/agent/rag";
import { getSilentAgentSystemPrompt } from "@/lib/agent/prompts";
import { getMeetingBotProvider } from "@/lib/meeting-bot";
import { rateLimit, resetRateLimitKey } from "@/lib/rate-limit";
import { McpClientManager } from "@/lib/mcp/client";

const TRIGGER_KEYWORDS = ["vernix"];
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

  // Load MCP tools for the meeting owner
  let mcpTools: Array<{
    type: "function";
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }> = [];
  let mcpManager: McpClientManager | null = null;
  try {
    mcpManager = await McpClientManager.connectForUser(userId);
    mcpTools = mcpManager.getOpenAITools();
  } catch (err) {
    console.warn(
      "[Silent Agent] MCP connection failed, proceeding without:",
      err
    );
  }

  const mcpToolDescriptions = mcpTools.map((t) => ({
    name: t.name,
    description: t.description,
  }));

  const systemPrompt = getSilentAgentSystemPrompt(agenda, mcpToolDescriptions);

  const userMessage = ragContext
    ? `Recent meeting transcript:\n${recentTranscript}\n\nRelevant context:\n${ragContext}`
    : `Recent meeting transcript:\n${recentTranscript}`;

  const openai = getOpenAIClient();

  const tools =
    mcpTools.length > 0
      ? mcpTools.map((t) => ({
          type: "function" as const,
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          },
        }))
      : undefined;

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  // One round of tool calls allowed
  const completion = await openai.chat.completions.create({
    model: "gpt-5.4-mini",
    messages,
    max_tokens: 200,
    temperature: 0.7,
    ...(tools ? { tools, tool_choice: "auto" } : {}),
  });

  const firstChoice = completion.choices[0];
  if (
    firstChoice?.finish_reason === "tool_calls" &&
    firstChoice.message.tool_calls &&
    mcpManager
  ) {
    // Execute tool calls and get final response
    messages.push(firstChoice.message);

    for (const call of firstChoice.message.tool_calls) {
      if (call.type !== "function") continue;
      let toolResult = "";
      try {
        const args = JSON.parse(call.function.arguments) as Record<
          string,
          unknown
        >;
        const result = await mcpManager.callTool(call.function.name, args);
        toolResult = JSON.stringify(result);
      } catch (err) {
        toolResult = `Error: ${err instanceof Error ? err.message : "Unknown error"}`;
      }
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: toolResult,
      });
    }

    const followUp = await openai.chat.completions.create({
      model: "gpt-5.4-mini",
      messages,
      max_tokens: 200,
      temperature: 0.7,
    });
    const response = followUp.choices[0]?.message?.content ?? "";
    return response.slice(0, MAX_RESPONSE_LENGTH);
  }

  const response = firstChoice?.message?.content ?? "";
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
    const response = await generateSilentResponse(
      meetingId,
      userId,
      fullText,
      agenda
    );
    if (response) {
      await getMeetingBotProvider().sendChatMessage(botId, response);
      console.log(`[Silent Agent] Sent chat response for meeting ${meetingId}`);
    } else {
      // Empty response — release the slot so future mentions can be answered
      resetRateLimitKey(rateLimitKey);
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
