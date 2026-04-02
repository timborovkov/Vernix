const {
  mockDb,
  mockScrollTranscript,
  mockGenerateSummary,
  mockExtractActionItems,
  mockStoreExtractedTasks,
  mockProvider,
  mockUploadFile,
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
    mockProvider: {
      joinMeeting: vi.fn(),
      leaveMeeting: vi.fn(),
      onTranscript: vi.fn(),
      getBot: vi.fn().mockResolvedValue({
        media_shortcuts: {},
        recordings: [],
        status_changes: [],
      }),
      deleteBot: vi.fn().mockResolvedValue(undefined),
      getParticipantEvents: vi.fn().mockResolvedValue([]),
    },
    mockUploadFile: vi.fn().mockResolvedValue(undefined),
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
vi.mock("@/lib/meeting-bot", () => ({
  getMeetingBotProvider: () => mockProvider,
}));
vi.mock("@/lib/storage/operations", () => ({
  uploadFile: mockUploadFile,
}));
vi.mock("@/lib/email/send", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@/lib/email/templates", () => ({
  getFirstMeetingEmailHtml: vi.fn().mockReturnValue("<html>first</html>"),
}));
vi.mock("@/lib/email/preferences", () => ({
  shouldSendEmail: vi.fn().mockReturnValue(false), // Skip email logic in processing tests
  buildUnsubscribeUrl: vi.fn().mockReturnValue(""),
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

  it("deletes Recall bot after successful recording capture", async () => {
    mockScrollTranscript.mockResolvedValueOnce([]);
    mockGenerateSummary.mockResolvedValueOnce("Summary");

    // getBot returns a bot with a recording URL
    mockProvider.getBot.mockResolvedValueOnce({
      media_shortcuts: {
        video_mixed: {
          data: { download_url: "https://recall.example.com/recording.mp4" },
        },
      },
      recordings: [{ id: "rec-1" }],
      status_changes: [],
    });

    // Mock the meeting metadata query (noRecording check)
    // Extra where calls: completed update, first-meeting-email user lookup, first-meeting-email count
    mockDb.where.mockResolvedValueOnce(undefined); // completed status update
    mockDb.where.mockResolvedValueOnce([]); // first meeting email user lookup (empty = skip)
    mockDb.where.mockResolvedValueOnce([{ metadata: {} }]); // noRecording check

    // Mock fetch for recording download
    const mockFetchResponse = {
      ok: true,
      headers: new Headers({ "content-length": "1024" }),
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(mockFetchResponse));

    // Mock the metadata persist query
    mockDb.where
      .mockResolvedValueOnce([{ metadata: {} }]) // current metadata read
      .mockResolvedValueOnce(undefined); // metadata update

    await processMeetingEnd("meeting-1", "user-1", "col-1", {
      botId: "bot-1",
    });

    expect(mockUploadFile).toHaveBeenCalledWith(
      "recordings/meeting-1.mp4",
      expect.any(Buffer),
      "video/mp4"
    );
    expect(mockProvider.deleteBot).toHaveBeenCalledWith("bot-1");
  });

  it("does NOT delete Recall bot when recording download fails", async () => {
    mockScrollTranscript.mockResolvedValueOnce([]);
    mockGenerateSummary.mockResolvedValueOnce("Summary");

    mockProvider.getBot.mockResolvedValueOnce({
      media_shortcuts: {
        video_mixed: {
          data: { download_url: "https://recall.example.com/recording.mp4" },
        },
      },
      recordings: [],
      status_changes: [],
    });

    // completed status update + first-meeting-email + noRecording check
    mockDb.where.mockResolvedValueOnce(undefined);
    mockDb.where.mockResolvedValueOnce([]); // first meeting email user lookup
    mockDb.where.mockResolvedValueOnce([{ metadata: {} }]);

    // fetch fails
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValueOnce(new Error("Network error"))
    );

    await processMeetingEnd("meeting-1", "user-1", "col-1", {
      botId: "bot-1",
    });

    // Bot should NOT be deleted — recording is still on Recall
    expect(mockProvider.deleteBot).not.toHaveBeenCalled();
  });

  it("deletes Recall bot when recording is intentionally skipped (noRecording)", async () => {
    mockScrollTranscript.mockResolvedValueOnce([]);
    mockGenerateSummary.mockResolvedValueOnce("Summary");

    mockProvider.getBot.mockResolvedValueOnce({
      media_shortcuts: {
        video_mixed: {
          data: { download_url: "https://recall.example.com/recording.mp4" },
        },
      },
      recordings: [],
      status_changes: [],
    });

    // completed status update + first-meeting-email + noRecording check
    mockDb.where.mockResolvedValueOnce(undefined);
    mockDb.where.mockResolvedValueOnce([]); // first meeting email user lookup
    mockDb.where.mockResolvedValueOnce([{ metadata: { noRecording: true } }]);

    await processMeetingEnd("meeting-1", "user-1", "col-1", {
      botId: "bot-1",
    });

    // Recording was intentionally skipped, bot can be safely deleted
    expect(mockUploadFile).not.toHaveBeenCalled();
    expect(mockProvider.deleteBot).toHaveBeenCalledWith("bot-1");
  });
});
