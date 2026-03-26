import PDFDocument from "pdfkit";
import {
  formatDate,
  formatTimestamp,
  type MeetingExportData,
} from "./markdown";

/** Strip markdown formatting to plain text for PDF rendering */
export function stripMarkdown(text: string): string {
  return (
    text
      // List markers first (before italic stripping to avoid * conflicts)
      .replace(/^[-*+]\s+/gm, "- ")
      .replace(/^(\d+)\.\s+/gm, "$1. ")
      // Headers
      .replace(/^#{1,6}\s+/gm, "")
      // Bold (must run before italic)
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/__(.+?)__/g, "$1")
      // Italic (non-greedy, must not start at line beginning after "- ")
      .replace(/(?<!\w)\*([^*]+?)\*(?!\*)/g, "$1")
      .replace(/(?<!\w)_([^_]+?)_(?!\w)/g, "$1")
      // Links
      .replace(/\[(.+?)\]\(.+?\)/g, "$1")
      // Inline code
      .replace(/`(.+?)`/g, "$1")
  );
}

function collectBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

export async function generateMeetingPdf(
  data: MeetingExportData
): Promise<Buffer> {
  const { meeting, tasks, transcript } = data;
  const meta = (meeting.metadata ?? {}) as Record<string, unknown>;

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const bufferPromise = collectBuffer(doc);

  // Title
  doc.fontSize(20).font("Helvetica-Bold").text(meeting.title);
  doc.moveDown(0.5);

  // Metadata
  doc.fontSize(10).font("Helvetica");
  const dateStr = formatDate(meeting.startedAt ?? meeting.createdAt);
  const participants =
    meeting.participants && meeting.participants.length > 0
      ? meeting.participants.join(", ")
      : "None recorded";
  doc.text(
    `Date: ${dateStr}  |  Status: ${meeting.status}  |  Participants: ${participants}`
  );
  doc.text(`Link: ${meeting.joinLink}`);
  doc.moveDown();

  // Summary
  doc.fontSize(14).font("Helvetica-Bold").text("Summary");
  doc.moveDown(0.3);
  doc.fontSize(10).font("Helvetica");
  doc.text(
    typeof meta.summary === "string" && meta.summary
      ? stripMarkdown(meta.summary)
      : "No summary available."
  );
  doc.moveDown();

  // Agenda
  doc.fontSize(14).font("Helvetica-Bold").text("Agenda");
  doc.moveDown(0.3);
  doc.fontSize(10).font("Helvetica");
  doc.text(
    typeof meta.agenda === "string" && meta.agenda
      ? stripMarkdown(meta.agenda)
      : "No agenda set."
  );
  doc.moveDown();

  // Action Items
  doc.fontSize(14).font("Helvetica-Bold").text("Action Items");
  doc.moveDown(0.3);
  doc.fontSize(10).font("Helvetica");
  if (tasks.length === 0) {
    doc.text("No action items.");
  } else {
    for (const task of tasks) {
      const assignee = task.assignee ?? "-";
      const dueDate = task.dueDate ? formatDate(task.dueDate) : "-";
      const check = task.status === "completed" ? "[x]" : "[ ]";
      doc.text(
        `${check} ${task.title} (Assignee: ${assignee}, Due: ${dueDate})`
      );
    }
  }
  doc.moveDown();

  // Transcript
  doc.fontSize(14).font("Helvetica-Bold").text("Transcript");
  doc.moveDown(0.3);
  doc.fontSize(9).font("Helvetica");
  if (transcript.length === 0) {
    doc.text("No transcript available.");
  } else {
    for (const segment of transcript) {
      const ts = formatTimestamp(segment.timestampMs);
      doc.text(`[${ts}] ${segment.speaker}: ${segment.text}`, {
        continued: false,
      });
    }
  }

  doc.end();
  return bufferPromise;
}
