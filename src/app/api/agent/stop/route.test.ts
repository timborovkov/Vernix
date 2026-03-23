import {
  createJsonRequest,
  parseJsonResponse,
  fakeMeeting,
} from "@/test/helpers";

const { mockDb, mockProvider, mockScrollTranscript, mockGenerateSummary } =
  vi.hoisted(() => {
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
      mockProvider: {
        joinMeeting: vi.fn(),
        leaveMeeting: vi.fn().mockResolvedValue(undefined),
        onTranscript: vi.fn(),
      },
      mockScrollTranscript: vi.fn().mockResolvedValue([]),
      mockGenerateSummary: vi.fn().mockResolvedValue("Test summary"),
    };
  });

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/meeting-bot", () => ({
  getMeetingBotProvider: () => mockProvider,
}));
vi.mock("@/lib/vector/scroll", () => ({
  scrollTranscript: mockScrollTranscript,
}));
vi.mock("@/lib/summary/generate", () => ({
  generateMeetingSummary: mockGenerateSummary,
}));
vi.mock("@/lib/tasks/extract", () => ({
  extractActionItems: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/tasks/store", () => ({
  storeExtractedTasks: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "./route";

const validUuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

describe("POST /api/agent/stop", () => {
  it("returns 400 for invalid meetingId", async () => {
    const req = createJsonRequest("http://localhost/api/agent/stop", {
      method: "POST",
      body: { meetingId: "bad" },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("returns 404 when meeting not found", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    const req = createJsonRequest("http://localhost/api/agent/stop", {
      method: "POST",
      body: { meetingId: validUuid },
    });

    const response = await POST(req);
    expect(response.status).toBe(404);
  });

  it("returns 400 when meeting status is pending", async () => {
    mockDb.where.mockResolvedValueOnce([fakeMeeting({ status: "pending" })]);

    const req = createJsonRequest("http://localhost/api/agent/stop", {
      method: "POST",
      body: { meetingId: validUuid },
    });

    const response = await POST(req);
    const { data } = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(data.error).toContain("Cannot stop meeting with status: pending");
  });

  it("stops active meeting and calls leaveMeeting", async () => {
    mockDb.where
      .mockResolvedValueOnce([
        fakeMeeting({ status: "active", metadata: { botId: "bot-42" } }),
      ])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    const req = createJsonRequest("http://localhost/api/agent/stop", {
      method: "POST",
      body: { meetingId: validUuid },
    });

    const response = await POST(req);
    const { status, data } = await parseJsonResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockProvider.leaveMeeting).toHaveBeenCalledWith("bot-42");
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "processing" })
    );
  });

  it("stops joining meeting without botId", async () => {
    mockDb.where
      .mockResolvedValueOnce([fakeMeeting({ status: "joining", metadata: {} })])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    const req = createJsonRequest("http://localhost/api/agent/stop", {
      method: "POST",
      body: { meetingId: validUuid },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
    expect(mockProvider.leaveMeeting).not.toHaveBeenCalled();
  });

  it("sets processing then completed with summary in metadata", async () => {
    const segments = [{ text: "Hello", speaker: "Alice", timestampMs: 1000 }];
    mockScrollTranscript.mockResolvedValueOnce(segments);
    mockGenerateSummary.mockResolvedValueOnce("Summary text");
    mockDb.where
      .mockResolvedValueOnce([
        fakeMeeting({
          status: "active",
          metadata: { botId: "bot-1" },
        }),
      ])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    const req = createJsonRequest("http://localhost/api/agent/stop", {
      method: "POST",
      body: { meetingId: validUuid },
    });

    await POST(req);

    const setCalls = mockDb.set.mock.calls;
    expect(setCalls[0][0]).toEqual(
      expect.objectContaining({ status: "processing" })
    );
    expect(setCalls[1][0]).toEqual(
      expect.objectContaining({
        status: "completed",
        metadata: expect.objectContaining({ summary: "Summary text" }),
      })
    );
  });

  it("completes without summary when processing fails", async () => {
    mockScrollTranscript.mockRejectedValueOnce(new Error("Qdrant down"));
    mockDb.where
      .mockResolvedValueOnce([
        fakeMeeting({ status: "active", metadata: { botId: "bot-1" } }),
      ])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    const req = createJsonRequest("http://localhost/api/agent/stop", {
      method: "POST",
      body: { meetingId: validUuid },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const setCalls = mockDb.set.mock.calls;
    expect(setCalls[0][0]).toEqual(
      expect.objectContaining({ status: "processing" })
    );
    expect(setCalls[1][0]).toEqual(
      expect.objectContaining({ status: "completed" })
    );
  });

  it("passes scrolled segments to generateMeetingSummary", async () => {
    const segments = [
      { text: "Point A", speaker: "Alice", timestampMs: 1000 },
      { text: "Point B", speaker: "Bob", timestampMs: 2000 },
    ];
    mockScrollTranscript.mockResolvedValueOnce(segments);
    mockDb.where
      .mockResolvedValueOnce([
        fakeMeeting({ status: "active", metadata: { botId: "bot-1" } }),
      ])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    const req = createJsonRequest("http://localhost/api/agent/stop", {
      method: "POST",
      body: { meetingId: validUuid },
    });

    await POST(req);

    expect(mockGenerateSummary).toHaveBeenCalledWith(
      segments,
      expect.objectContaining({ title: "Test Meeting" })
    );
  });

  it("recovers stuck processing meeting without calling leaveMeeting", async () => {
    const endedAt = new Date("2026-03-20T10:00:00Z");
    mockDb.where
      .mockResolvedValueOnce([
        fakeMeeting({
          status: "processing",
          metadata: { botId: "bot-1" },
          endedAt,
        }),
      ])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    const req = createJsonRequest("http://localhost/api/agent/stop", {
      method: "POST",
      body: { meetingId: validUuid },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
    expect(mockProvider.leaveMeeting).not.toHaveBeenCalled();

    // Should preserve original endedAt, not overwrite with new Date
    const setCalls = mockDb.set.mock.calls;
    expect(setCalls[0][0].endedAt).toEqual(endedAt);
  });
});
