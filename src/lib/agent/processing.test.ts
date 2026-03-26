const {
  mockDb,
  mockScrollTranscript,
  mockGenerateSummary,
  mockExtractActionItems,
  mockStoreExtractedTasks,
} = vi.hoisted(() => {
  const db: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of [
    "select",
    "from",
    "where",
    "orderBy",
    "insert",
    "values",
    "returning",
    "update",
    "set",
    "delete",
  ]) {
    db[m] = vi.fn().mockImplementation(() => db);
  }
  return {
    mockDb: db,
    mockScrollTranscript: vi.fn().mockResolvedValue([]),
    mockGenerateSummary: vi.fn().mockResolvedValue("Test summary"),
    mockExtractActionItems: vi.fn().mockResolvedValue([]),
    mockStoreExtractedTasks: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/vector/scroll", () => ({
  scrollTranscript: mockScrollTranscript,
}));
vi.mock("@/lib/summary/generate", () => ({
  generateMeetingSummary: mockGenerateSummary,
}));
vi.mock("@/lib/tasks/extract", () => ({
  extractActionItems: mockExtractActionItems,
}));
vi.mock("@/lib/tasks/store", () => ({
  storeExtractedTasks: mockStoreExtractedTasks,
}));

import { processMeetingEnd } from "./processing";

describe("processMeetingEnd", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates summary and extracts tasks", async () => {
    const segments = [{ text: "hello", speaker: "Alice", timestampMs: 0 }];
    mockScrollTranscript.mockResolvedValueOnce(segments);
    mockGenerateSummary.mockResolvedValueOnce("Meeting summary");
    mockExtractActionItems.mockResolvedValueOnce([
      { title: "Follow up", assignee: null },
    ]);

    await processMeetingEnd("meeting-1", "user-1", "col-1", {
      title: "Test",
      agenda: "discuss things",
    });

    expect(mockScrollTranscript).toHaveBeenCalledWith("col-1");
    expect(mockGenerateSummary).toHaveBeenCalledWith(
      segments,
      expect.objectContaining({ title: "Test", agenda: "discuss things" })
    );
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "completed",
        metadata: expect.objectContaining({ summary: "Meeting summary" }),
      })
    );
    expect(mockExtractActionItems).toHaveBeenCalledWith(segments);
    expect(mockStoreExtractedTasks).toHaveBeenCalledWith(
      "meeting-1",
      "user-1",
      [{ title: "Follow up", assignee: null }]
    );
  });

  it("completes meeting even when summary fails", async () => {
    mockScrollTranscript.mockRejectedValueOnce(new Error("Qdrant down"));

    await processMeetingEnd("meeting-1", "user-1", "col-1", {});

    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "completed" })
    );
  });

  it("completes meeting even when task extraction fails", async () => {
    mockScrollTranscript.mockResolvedValueOnce([]);
    mockGenerateSummary.mockResolvedValueOnce("Summary");
    mockExtractActionItems.mockRejectedValueOnce(new Error("LLM error"));

    await processMeetingEnd("meeting-1", "user-1", "col-1", {});

    // Should still set completed with summary
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "completed",
        metadata: expect.objectContaining({ summary: "Summary" }),
      })
    );
  });
});
