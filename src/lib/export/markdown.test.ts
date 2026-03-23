import { describe, it, expect } from "vitest";
import { fakeMeeting, fakeTask } from "@/test/helpers";
import type { TranscriptPoint } from "@/lib/vector/scroll";
import {
  formatMeetingMarkdown,
  formatTimestamp,
  slugify,
  type MeetingExportData,
} from "./markdown";

function fakeTranscript(
  overrides: Partial<TranscriptPoint> = {}
): TranscriptPoint {
  return {
    text: "Hello everyone",
    speaker: "Alice",
    timestampMs: 0,
    ...overrides,
  };
}

describe("formatTimestamp", () => {
  it("formats zero", () => {
    expect(formatTimestamp(0)).toBe("00:00");
  });

  it("formats seconds only", () => {
    expect(formatTimestamp(45_000)).toBe("00:45");
  });

  it("formats minutes and seconds", () => {
    expect(formatTimestamp(125_000)).toBe("02:05");
  });

  it("formats with hours when >= 1 hour", () => {
    expect(formatTimestamp(3_661_000)).toBe("01:01:01");
  });
});

describe("slugify", () => {
  it("lowercases and replaces spaces", () => {
    expect(slugify("My Meeting Title")).toBe("my-meeting-title");
  });

  it("removes special characters", () => {
    expect(slugify("Q3 Review (Draft)")).toBe("q3-review-draft");
  });

  it("truncates to 60 characters", () => {
    const long = "a".repeat(100);
    expect(slugify(long).length).toBeLessThanOrEqual(60);
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugify("--hello--")).toBe("hello");
  });

  it("returns empty string for non-Latin titles", () => {
    expect(slugify("日本語")).toBe("");
  });

  it("does not end with hyphen after truncation", () => {
    expect(slugify("word ".repeat(20).trim()).endsWith("-")).toBe(false);
  });
});

describe("formatMeetingMarkdown", () => {
  it("renders full meeting data", () => {
    const data: MeetingExportData = {
      meeting: fakeMeeting({
        title: "Sprint Review",
        participants: ["Alice", "Bob"],
        metadata: { summary: "Great meeting.", agenda: "Review sprint goals." },
        startedAt: new Date("2026-03-01T10:00:00Z"),
      }),
      tasks: [
        fakeTask({ title: "Write tests", assignee: "Bob", status: "open" }),
        fakeTask({
          id: "e4ccff33-0000-0000-0000-000000000001",
          title: "Deploy fix",
          assignee: null,
          dueDate: new Date("2026-03-15"),
          status: "completed",
        }),
      ],
      transcript: [
        fakeTranscript({
          timestampMs: 0,
          speaker: "Alice",
          text: "Let's begin",
        }),
        fakeTranscript({
          timestampMs: 60_000,
          speaker: "Bob",
          text: "Sounds good",
        }),
      ],
    };

    const md = formatMeetingMarkdown(data);

    expect(md).toContain("# Sprint Review");
    expect(md).toContain("**Date:** 2026-03-01");
    expect(md).toContain("**Participants:** Alice, Bob");
    expect(md).toContain("Great meeting.");
    expect(md).toContain("Review sprint goals.");
    expect(md).toContain("| Write tests | Bob | - | open |");
    expect(md).toContain("| Deploy fix | - | 2026-03-15 | completed |");
    expect(md).toContain("**[00:00] Alice:** Let's begin");
    expect(md).toContain("**[01:00] Bob:** Sounds good");
  });

  it("shows fallbacks when data is missing", () => {
    const data: MeetingExportData = {
      meeting: fakeMeeting({
        participants: [],
        metadata: {},
        startedAt: null,
      }),
      tasks: [],
      transcript: [],
    };

    const md = formatMeetingMarkdown(data);

    expect(md).toContain("None recorded");
    expect(md).toContain("No summary available.");
    expect(md).toContain("No agenda set.");
    expect(md).toContain("No action items.");
    expect(md).toContain("No transcript available.");
  });

  it("uses createdAt when startedAt is null", () => {
    const data: MeetingExportData = {
      meeting: fakeMeeting({
        startedAt: null,
        createdAt: new Date("2026-02-14"),
      }),
      tasks: [],
      transcript: [],
    };

    const md = formatMeetingMarkdown(data);
    expect(md).toContain("**Date:** 2026-02-14");
  });

  it("escapes pipe characters in task titles and assignees", () => {
    const data: MeetingExportData = {
      meeting: fakeMeeting(),
      tasks: [fakeTask({ title: "Fix | deploy", assignee: "Alice | Bob" })],
      transcript: [],
    };

    const md = formatMeetingMarkdown(data);
    expect(md).toContain("Fix \\| deploy");
    expect(md).toContain("Alice \\| Bob");
  });
});
