import { getOpenAIClient } from "@/lib/openai/client";
import type { TranscriptPoint } from "@/lib/vector/scroll";

const MAX_ITEMS = 50;

export interface ExtractedTask {
  title: string;
  assignee: string | null;
}

/**
 * Extract action items from meeting transcript segments using LLM.
 * Returns structured task data ready for storage.
 */
export async function extractActionItems(
  segments: TranscriptPoint[]
): Promise<ExtractedTask[]> {
  if (segments.length === 0) return [];

  const sorted = [...segments].sort((a, b) => a.timestampMs - b.timestampMs);
  const transcript = sorted.map((s) => `[${s.speaker}]: ${s.text}`).join("\n");

  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: "gpt-5.4-mini",
    messages: [
      {
        role: "system",
        content:
          'Extract action items, decisions, and follow-ups from this meeting transcript. Return a JSON object with an "items" array. Each item has "title" (string, concise action description) and "assignee" (string or null — the person responsible if mentioned). Only include clear, actionable items.',
      },
      { role: "user", content: transcript },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return [];

  try {
    const parsed = JSON.parse(content);
    const items = Array.isArray(parsed.items) ? parsed.items : [];

    return items
      .filter(
        (item: unknown): item is { title: string; assignee: string | null } =>
          typeof item === "object" &&
          item !== null &&
          "title" in item &&
          typeof (item as Record<string, unknown>).title === "string"
      )
      .slice(0, MAX_ITEMS)
      .map((item: { title: string; assignee: string | null }) => ({
        title: item.title,
        assignee: typeof item.assignee === "string" ? item.assignee : null,
      }));
  } catch {
    return [];
  }
}
