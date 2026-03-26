import { resetRateLimits } from "@/lib/rate-limit";

const { mockDb, mockLeaveMeeting, mockProcessMeetingEnd } = vi.hoisted(() => {
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
    mockLeaveMeeting: vi.fn().mockResolvedValue(undefined),
    mockProcessMeetingEnd: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/meeting-bot", () => ({
  getMeetingBotProvider: () => ({ leaveMeeting: mockLeaveMeeting }),
}));
vi.mock("@/lib/agent/processing", () => ({
  processMeetingEnd: mockProcessMeetingEnd,
}));

import { POST } from "./route";
import { createJsonRequest, parseJsonResponse } from "@/test/helpers";

const URL = "http://localhost/api/agent/leave";

describe("POST /api/agent/leave", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimits();
  });

  it("returns 400 on missing fields", async () => {
    const req = createJsonRequest(URL, {
      method: "POST",
      body: { meetingId: "not-a-uuid" },
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
  });

  it("returns 404 for unknown meeting", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        botSecret: "secret-123",
      },
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(404);
  });

  it("returns 403 on invalid botSecret", async () => {
    mockDb.where.mockResolvedValueOnce([
      {
        id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        userId: "user-1",
        status: "active",
        metadata: { voiceSecret: "correct-secret", botId: "bot-1" },
        qdrantCollectionName: "col-1",
        title: "Test",
        startedAt: null,
        endedAt: null,
        participants: [],
      },
    ]);

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        botSecret: "wrong-secret",
      },
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(403);
  });

  it("leaves meeting and triggers processing on valid request", async () => {
    mockDb.where.mockResolvedValueOnce([
      {
        id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        userId: "user-1",
        status: "active",
        metadata: { voiceSecret: "valid-secret", botId: "bot-1" },
        qdrantCollectionName: "col-1",
        title: "Test Meeting",
        startedAt: null,
        endedAt: null,
        participants: [],
      },
    ]);

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        botSecret: "valid-secret",
      },
    });
    const { status, data } = await parseJsonResponse(await POST(req));

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockLeaveMeeting).toHaveBeenCalledWith("bot-1");
    expect(mockProcessMeetingEnd).toHaveBeenCalledWith(
      "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      "user-1",
      "col-1",
      expect.objectContaining({ title: "Test Meeting" })
    );
  });

  it("sets status to processing in DB", async () => {
    mockDb.where.mockResolvedValueOnce([
      {
        id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        userId: "user-1",
        status: "active",
        metadata: { voiceSecret: "valid-secret", botId: "bot-1" },
        qdrantCollectionName: "col-1",
        title: "Test Meeting",
        startedAt: null,
        endedAt: null,
        participants: [],
      },
    ]);

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        botSecret: "valid-secret",
      },
    });
    await POST(req);

    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "processing" })
    );
  });

  it("returns 429 when rate limited", async () => {
    // The route allows 5 requests per 60s
    for (let i = 0; i < 5; i++) {
      mockDb.where.mockResolvedValueOnce([]);
      const req = createJsonRequest(URL, {
        method: "POST",
        body: {
          meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          botSecret: "secret",
        },
      });
      await POST(req);
    }

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        botSecret: "secret",
      },
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(429);
  });

  it("accepts botId as auth for silent mode", async () => {
    mockDb.where.mockResolvedValueOnce([
      {
        id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        userId: "user-1",
        status: "active",
        metadata: { botId: "bot-1", silent: true },
        qdrantCollectionName: "col-1",
        title: "Silent Meeting",
        startedAt: null,
        endedAt: null,
        participants: [],
      },
    ]);

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        botSecret: "bot-1",
      },
    });
    const { status, data } = await parseJsonResponse(await POST(req));

    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });
});
