import type { Meeting, Task } from "@/lib/db/schema";
import type { TranscriptPoint } from "@/lib/vector/scroll";

export interface MeetingExportData {
  meeting: Meeting;
  tasks: Task[];
  transcript: TranscriptPoint[];
}

export function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function escapeTableCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function formatDate(date: Date | null): string {
  if (!date) return "N/A";
  return date.toISOString().split("T")[0]!;
}

export function formatMeetingMarkdown(data: MeetingExportData): string {
  const { meeting, tasks, transcript } = data;
  const meta = (meeting.metadata ?? {}) as Record<string, unknown>;
  const lines: string[] = [];

  lines.push(`# ${meeting.title}`);
  lines.push("");
  lines.push(`**Date:** ${formatDate(meeting.startedAt ?? meeting.createdAt)}`);
  lines.push(`**Status:** ${meeting.status}`);
  const participants =
    meeting.participants && meeting.participants.length > 0
      ? meeting.participants.join(", ")
      : "None recorded";
  lines.push(`**Participants:** ${participants}`);
  lines.push(`**Link:** ${meeting.joinLink}`);
  lines.push("");

  // Summary
  lines.push("## Summary");
  lines.push("");
  lines.push(
    typeof meta.summary === "string" && meta.summary
      ? meta.summary
      : "No summary available."
  );
  lines.push("");

  // Agenda
  lines.push("## Agenda");
  lines.push("");
  lines.push(
    typeof meta.agenda === "string" && meta.agenda
      ? meta.agenda
      : "No agenda set."
  );
  lines.push("");

  // Action Items
  lines.push("## Action Items");
  lines.push("");
  if (tasks.length === 0) {
    lines.push("No action items.");
  } else {
    lines.push("| Task | Assignee | Due Date | Status |");
    lines.push("|------|----------|----------|--------|");
    for (const task of tasks) {
      const title = escapeTableCell(task.title);
      const assignee = escapeTableCell(task.assignee ?? "-");
      const dueDate = task.dueDate ? formatDate(task.dueDate) : "-";
      lines.push(`| ${title} | ${assignee} | ${dueDate} | ${task.status} |`);
    }
  }
  lines.push("");

  // Transcript
  lines.push("## Transcript");
  lines.push("");
  if (transcript.length === 0) {
    lines.push("No transcript available.");
  } else {
    for (const segment of transcript) {
      lines.push(
        `**[${formatTimestamp(segment.timestampMs)}] ${segment.speaker}:** ${segment.text}`
      );
    }
  }
  lines.push("");

  return lines.join("\n");
}
