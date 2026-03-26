import {
  createJsonRequest,
  parseJsonResponse,
  fakeMeeting,
} from "@/test/helpers";

const { mockDb, mockProvider } = vi.hoisted(() => {
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
      joinMeeting: vi.fn().mockResolvedValue({ botId: "bot-1" }),
      leaveMeeting: vi.fn(),
      onTranscript: vi.fn(),
    },
  };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/meeting-bot", () => ({
  getMeetingBotProvider: () => mockProvider,
}));

import { POST } from "./route";

const validUuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

describe("POST /api/agent/join", () => {
  it("returns 400 for invalid meetingId", async () => {
    const req = createJsonRequest("http://localhost/api/agent/join", {
      method: "POST",
      body: { meetingId: "not-a-uuid" },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("returns 404 when meeting not found", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    const req = createJsonRequest("http://localhost/api/agent/join", {
      method: "POST",
      body: { meetingId: validUuid },
    });

    const response = await POST(req);
    expect(response.status).toBe(404);
  });

  it("returns 400 when meeting status is active", async () => {
    mockDb.where.mockResolvedValueOnce([fakeMeeting({ status: "active" })]);

    const req = createJsonRequest("http://localhost/api/agent/join", {
      method: "POST",
      body: { meetingId: validUuid },
    });

    const response = await POST(req);
    const { status, data } = await parseJsonResponse(response);

    expect(status).toBe(400);
    expect(data.error).toContain("Cannot join meeting with status: active");
  });

  it("transitions pending -> joining -> active on success", async () => {
    mockDb.where
      .mockResolvedValueOnce([fakeMeeting({ status: "pending" })])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    const req = createJsonRequest("http://localhost/api/agent/join", {
      method: "POST",
      body: { meetingId: validUuid },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const setCalls = mockDb.set.mock.calls;
    expect(setCalls[0][0]).toMatchObject({ status: "joining" });
    expect(setCalls[1][0]).toMatchObject({ status: "active" });
  });

  it("transitions to failed when provider throws", async () => {
    mockDb.where
      .mockResolvedValueOnce([fakeMeeting({ status: "pending" })])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);
    mockProvider.joinMeeting.mockRejectedValueOnce(
      new Error("Connection refused")
    );

    const req = createJsonRequest("http://localhost/api/agent/join", {
      method: "POST",
      body: { meetingId: validUuid },
    });

    const response = await POST(req);
    expect(response.status).toBe(500);

    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed" })
    );
  });

  it("allows joining from failed status", async () => {
    mockDb.where
      .mockResolvedValueOnce([fakeMeeting({ status: "failed" })])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    const req = createJsonRequest("http://localhost/api/agent/join", {
      method: "POST",
      body: { meetingId: validUuid },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
  });

  it("stores voiceSecret in metadata when provider returns one", async () => {
    mockProvider.joinMeeting.mockResolvedValueOnce({
      botId: "bot-1",
      voiceSecret: "secret-abc",
    });
    mockDb.where
      .mockResolvedValueOnce([fakeMeeting({ status: "pending" })])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    const req = createJsonRequest("http://localhost/api/agent/join", {
      method: "POST",
      body: { meetingId: validUuid },
    });

    await POST(req);

    // Second set call is the active transition with metadata
    const activeSetCall = mockDb.set.mock.calls[1][0];
    expect(activeSetCall.status).toBe("active");
    expect(activeSetCall.metadata).toMatchObject({
      botId: "bot-1",
      voiceSecret: "secret-abc",
    });
  });

  it("omits voiceSecret from metadata in silent mode", async () => {
    mockProvider.joinMeeting.mockResolvedValueOnce({
      botId: "bot-1",
      voiceSecret: undefined,
    });
    mockDb.where
      .mockResolvedValueOnce([
        fakeMeeting({ status: "pending", metadata: { silent: true } }),
      ])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    const req = createJsonRequest("http://localhost/api/agent/join", {
      method: "POST",
      body: { meetingId: validUuid },
    });

    await POST(req);

    const activeSetCall = mockDb.set.mock.calls[1][0];
    expect(activeSetCall.metadata).toMatchObject({
      botId: "bot-1",
      silent: true,
    });
    expect(activeSetCall.metadata).not.toHaveProperty("voiceSecret");
  });

  it("passes silent option to provider when meeting has silent metadata", async () => {
    mockDb.where
      .mockResolvedValueOnce([
        fakeMeeting({ status: "pending", metadata: { silent: true } }),
      ])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    const req = createJsonRequest("http://localhost/api/agent/join", {
      method: "POST",
      body: { meetingId: validUuid },
    });

    await POST(req);

    expect(mockProvider.joinMeeting).toHaveBeenCalledWith(
      expect.any(String),
      validUuid,
      undefined,
      { silent: true }
    );
  });
});
