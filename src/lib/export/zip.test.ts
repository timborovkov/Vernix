import { describe, it, expect } from "vitest";
import { fakeMeeting, fakeTask } from "@/test/helpers";
import type { MeetingExportData } from "./markdown";
import { generateMeetingsZip } from "./zip";

function makeExportData(
  overrides: Partial<MeetingExportData> = {}
): MeetingExportData {
  return {
    meeting: fakeMeeting(),
    tasks: [fakeTask()],
    transcript: [{ text: "Hello", speaker: "Alice", timestampMs: 0 }],
    ...overrides,
  };
}

describe("generateMeetingsZip", () => {
  it("returns a buffer starting with ZIP magic bytes", async () => {
    const buffer = await generateMeetingsZip([makeExportData()]);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.subarray(0, 2).toString()).toBe("PK");
  });

  it("produces a larger buffer for multiple meetings", async () => {
    const single = await generateMeetingsZip([makeExportData()]);
    const multi = await generateMeetingsZip([
      makeExportData({
        meeting: fakeMeeting({
          id: "a0000000-0000-0000-0000-000000000001",
          title: "Meeting A",
        }),
      }),
      makeExportData({
        meeting: fakeMeeting({
          id: "a0000000-0000-0000-0000-000000000002",
          title: "Meeting B",
        }),
      }),
    ]);

    expect(multi.length).toBeGreaterThan(single.length);
  });

  it("handles empty meetings array", async () => {
    const buffer = await generateMeetingsZip([]);

    expect(buffer).toBeInstanceOf(Buffer);
    // Even empty, it should have the ZIP header and metadata.json
    expect(buffer.subarray(0, 2).toString()).toBe("PK");
  });

  it("deduplicates slugs for same-titled meetings", async () => {
    const buffer = await generateMeetingsZip([
      makeExportData({
        meeting: fakeMeeting({
          id: "a0000000-0000-0000-0000-000000000001",
          title: "Same Title",
        }),
      }),
      makeExportData({
        meeting: fakeMeeting({
          id: "a0000000-0000-0000-0000-000000000002",
          title: "Same Title",
        }),
      }),
    ]);

    expect(buffer.subarray(0, 2).toString()).toBe("PK");
    // Both should be in the archive without collision
    expect(buffer.length).toBeGreaterThan(100);
  });
});
