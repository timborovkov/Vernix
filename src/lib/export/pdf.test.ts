import { describe, it, expect } from "vitest";
import { fakeMeeting, fakeTask } from "@/test/helpers";
import type { MeetingExportData } from "./markdown";
import { generateMeetingPdf, stripMarkdown } from "./pdf";

describe("generateMeetingPdf", () => {
  it("returns a buffer starting with PDF magic bytes", async () => {
    const data: MeetingExportData = {
      meeting: fakeMeeting({
        title: "PDF Test",
        metadata: { summary: "A summary", agenda: "An agenda" },
        participants: ["Alice"],
      }),
      tasks: [fakeTask()],
      transcript: [
        { text: "Hello", speaker: "Alice", timestampMs: 0 },
        { text: "Hi", speaker: "Bob", timestampMs: 5000 },
      ],
    };

    const buffer = await generateMeetingPdf(data);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(100);
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("produces valid PDF for empty meeting", async () => {
    const data: MeetingExportData = {
      meeting: fakeMeeting({ metadata: {}, participants: [] }),
      tasks: [],
      transcript: [],
    };

    const buffer = await generateMeetingPdf(data);

    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(100);
  });
});

describe("stripMarkdown", () => {
  it("strips bold markers", () => {
    expect(stripMarkdown("**bold text**")).toBe("bold text");
    expect(stripMarkdown("__bold text__")).toBe("bold text");
  });

  it("strips italic markers", () => {
    expect(stripMarkdown("*italic*")).toBe("italic");
    expect(stripMarkdown("_italic_")).toBe("italic");
  });

  it("strips headings", () => {
    expect(stripMarkdown("# Heading 1")).toBe("Heading 1");
    expect(stripMarkdown("### Heading 3")).toBe("Heading 3");
  });

  it("strips links but keeps text", () => {
    expect(stripMarkdown("[click here](http://example.com)")).toBe(
      "click here"
    );
  });

  it("strips inline code backticks", () => {
    expect(stripMarkdown("`some code`")).toBe("some code");
  });

  it("normalizes bullet markers", () => {
    expect(stripMarkdown("* item")).toBe("- item");
    expect(stripMarkdown("+ item")).toBe("- item");
    expect(stripMarkdown("- item")).toBe("- item");
  });

  it("handles mixed markdown", () => {
    const input = "**Key Decision:** Use [Next.js](https://nextjs.org)";
    const output = stripMarkdown(input);
    expect(output).toBe("Key Decision: Use Next.js");
  });

  it("preserves plain text", () => {
    expect(stripMarkdown("Hello world")).toBe("Hello world");
  });

  it("handles list items with italic content", () => {
    expect(stripMarkdown("* Revenue grew *significantly*")).toBe(
      "- Revenue grew significantly"
    );
  });

  it("handles bold inside list items", () => {
    expect(stripMarkdown("- **Important:** do this")).toBe(
      "- Important: do this"
    );
  });
});
