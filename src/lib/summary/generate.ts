import { getOpenAIClient } from "@/lib/openai/client";
import type { TranscriptPoint } from "@/lib/vector/scroll";

export interface SummaryOptions {
  title?: string;
  startedAt?: Date | null;
  participants?: string[];
  agenda?: string;
}

function truncateText(text: string, maxLength = 180) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

function buildFallbackSummary(
  sortedSegments: TranscriptPoint[],
  options?: SummaryOptions,
  reason?: string
) {
  const highlights = sortedSegments
    .map((segment) => ({
      speaker: segment.speaker?.trim() || "Unknown",
      text: segment.text?.trim() || "",
    }))
    .filter((segment) => segment.text.length > 0)
    .slice(0, 8)
    .map(
      (segment) => `- **${segment.speaker}:** ${truncateText(segment.text)}`
    );

  const observedSpeakers = Array.from(
    new Set(
      sortedSegments
        .map((segment) => segment.speaker?.trim())
        .filter((speaker): speaker is string => Boolean(speaker))
    )
  );
  const participantList = options?.participants?.length
    ? options.participants
    : observedSpeakers;

  const lines = [
    "Automatic summary generation failed temporarily.",
    reason ? `Reason: ${reason}` : undefined,
    options?.title ? `Meeting: ${options.title}` : undefined,
    options?.startedAt ? `Date: ${options.startedAt.toISOString()}` : undefined,
    participantList.length
      ? `Participants: ${participantList.join(", ")}`
      : undefined,
    "",
    "Transcript highlights:",
    ...(highlights.length > 0
      ? highlights
      : ["- No transcript excerpts available."]),
  ].filter((line): line is string => line !== undefined);

  return lines.join("\n");
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

  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: "gpt-5.4-mini",
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

    const summary = response.choices[0]?.message?.content?.trim();
    if (!summary) {
      return buildFallbackSummary(
        sorted,
        options,
        "Model returned empty summary."
      );
    }

    return summary;
  } catch (error) {
    console.error("OpenAI summary generation failed:", error);
    const reason = error instanceof Error ? error.message : "Unknown error.";
    return buildFallbackSummary(sorted, options, reason);
  }
}
