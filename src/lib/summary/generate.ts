import { getOpenAIClient } from "@/lib/openai/client";
import type { TranscriptPoint } from "@/lib/vector/scroll";

export interface SummaryOptions {
  title?: string;
  startedAt?: Date | null;
  participants?: string[];
  agenda?: string;
}

export async function generateMeetingSummary(
  segments: TranscriptPoint[],
  options?: SummaryOptions
): Promise<string> {
  if (segments.length === 0) {
    return "No transcript content available.";
  }

  const sorted = [...segments].sort((a, b) => a.timestampMs - b.timestampMs);
  const transcriptText = sorted
    .map((s) => `[${s.speaker}]: ${s.text}`)
    .join("\n");

  // Build context header with meeting metadata
  let context = "";
  if (options?.title) context += `Meeting title: ${options.title}\n`;
  if (options?.startedAt)
    context += `Date: ${options.startedAt.toISOString()}\n`;
  if (options?.participants?.length)
    context += `Participants: ${options.participants.join(", ")}\n`;
  if (options?.agenda) context += `Meeting Agenda:\n${options.agenda}\n`;

  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a meeting assistant. Summarize the following meeting transcript concisely. Include key decisions, action items, and main discussion points. Keep it under 500 words. Use the provided meeting metadata (title, date, participants, agenda) in your summary. If an agenda was provided, note which items were discussed and any that were not covered.",
      },
      {
        role: "user",
        content: context
          ? `${context}\n---\n\n${transcriptText}`
          : transcriptText,
      },
    ],
    temperature: 0.3,
    max_tokens: 1000,
  });

  return response.choices[0]?.message?.content ?? "Summary generation failed.";
}
