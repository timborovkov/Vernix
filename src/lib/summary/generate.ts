import { getOpenAIClient } from "@/lib/openai/client";
import type { TranscriptPoint } from "@/lib/vector/scroll";

export async function generateMeetingSummary(
  segments: TranscriptPoint[]
): Promise<string> {
  if (segments.length === 0) {
    return "No transcript content available.";
  }

  const sorted = [...segments].sort((a, b) => a.timestampMs - b.timestampMs);
  const transcriptText = sorted
    .map((s) => `[${s.speaker}]: ${s.text}`)
    .join("\n");

  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a meeting assistant. Summarize the following meeting transcript concisely. Include key decisions, action items, and main discussion points. Keep it under 500 words.",
      },
      { role: "user", content: transcriptText },
    ],
    temperature: 0.3,
    max_tokens: 1000,
  });

  return response.choices[0]?.message?.content ?? "Summary generation failed.";
}
