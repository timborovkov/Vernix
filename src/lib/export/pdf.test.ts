import { describe, it, expect } from "vitest";
import { fakeMeeting, fakeTask } from "@/test/helpers";
import type { MeetingExportData } from "./markdown";
import { generateMeetingPdf } from "./pdf";

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
