import {
  createJsonRequest,
  parseJsonResponse,
  fakeMeeting,
} from "@/test/helpers";

const { mockDb, mockProvider, mockProcessMeetingEnd } = vi.hoisted(() => {
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
    mockProcessMeetingEnd: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/meeting-bot", () => ({
  getMeetingBotProvider: () => mockProvider,
}));
vi.mock("@/lib/agent/processing", () => ({
  processMeetingEnd: mockProcessMeetingEnd,
}));

import { POST } from "./route";

const validUuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

describe("POST /api/agent/stop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it("stops active meeting and calls leaveMeeting with correct botId", async () => {
    mockDb.where
      .mockResolvedValueOnce([
        fakeMeeting({ status: "active", metadata: { botId: "bot-42" } }),
      ])
      .mockImplementationOnce(() => mockDb) // processing update
      .mockResolvedValueOnce([{ status: "completed" }]); // re-fetch

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

  it("stops joining meeting without botId — does not call leaveMeeting", async () => {
    mockDb.where
      .mockResolvedValueOnce([fakeMeeting({ status: "joining", metadata: {} })])
      .mockImplementationOnce(() => mockDb)
      .mockResolvedValueOnce([{ status: "completed" }]);

    const req = createJsonRequest("http://localhost/api/agent/stop", {
      method: "POST",
      body: { meetingId: validUuid },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
    expect(mockProvider.leaveMeeting).not.toHaveBeenCalled();
  });

  it("sets processing status and calls processMeetingEnd with correct args", async () => {
    const meeting = fakeMeeting({
      status: "active",
      metadata: { botId: "bot-1" },
    });
    mockDb.where
      .mockResolvedValueOnce([meeting])
      .mockImplementationOnce(() => mockDb)
      .mockResolvedValueOnce([{ status: "completed" }]);

    const req = createJsonRequest("http://localhost/api/agent/stop", {
      method: "POST",
      body: { meetingId: validUuid },
    });

    await POST(req);

    // Verify status was set to processing
    const setCalls = mockDb.set.mock.calls;
    expect(setCalls[0][0]).toEqual(
      expect.objectContaining({ status: "processing" })
    );

    // Verify processMeetingEnd was called with correct arguments
    expect(mockProcessMeetingEnd).toHaveBeenCalledWith(
      validUuid,
      "b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22", // test user id
      meeting.qdrantCollectionName,
      expect.objectContaining({
        botId: "bot-1",
        title: meeting.title,
      })
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
      .mockImplementationOnce(() => mockDb) // processing update
      .mockResolvedValueOnce([{ status: "completed" }]); // re-fetch

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
