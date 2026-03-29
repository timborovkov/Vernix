import { getOpenAIClient } from "@/lib/openai/client";
import type { TranscriptPoint } from "@/lib/vector/scroll";

const MAX_ITEMS = 50;

export interface ExtractedTask {
  title: string;
  assignee: string | null;
  sourceText: string | null;
  sourceTimestampMs: number | null;
}

/**
 * Extract action items from meeting transcript segments using LLM.
 * Returns structured task data with source context ready for storage.
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
          'Extract action items, decisions, and follow-ups from this meeting transcript. Return a JSON object with an "items" array. Each item has: "title" (string, concise action description), "assignee" (string or null — the person responsible if mentioned), and "sourceQuote" (string or null — the exact transcript line that triggered this action item, copied verbatim from the input). Only include clear, actionable items.',
      },
      { role: "user", content: transcript },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_completion_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return [];

  try {
    const parsed = JSON.parse(content);
    const items = Array.isArray(parsed.items) ? parsed.items : [];

    return items
      .filter(
        (item: unknown): item is Record<string, unknown> =>
          typeof item === "object" &&
          item !== null &&
          "title" in item &&
          typeof (item as Record<string, unknown>).title === "string"
      )
      .slice(0, MAX_ITEMS)
      .map((item: Record<string, unknown>) => {
        const sourceQuote =
          typeof item.sourceQuote === "string" ? item.sourceQuote : null;

        // Match the source quote back to a segment to get the timestamp
        let sourceTimestampMs: number | null = null;
        if (sourceQuote) {
          // Match priority: exact format match > exact text > substring (with length guard)
          const match =
            sorted.find((s) => `[${s.speaker}]: ${s.text}` === sourceQuote) ??
            sorted.find((s) => s.text === sourceQuote) ??
            sorted.find(
              (s) =>
                s.text.length > 10 &&
                (sourceQuote.includes(s.text) || s.text.includes(sourceQuote))
            );
          if (match) sourceTimestampMs = match.timestampMs;
        }

        return {
          title: item.title as string,
          assignee:
            typeof item.assignee === "string"
              ? (item.assignee as string)
              : null,
          sourceText: sourceQuote,
          sourceTimestampMs,
        };
      });
  } catch {
    return [];
  }
}
