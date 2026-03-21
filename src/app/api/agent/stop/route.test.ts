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
      joinMeeting: vi.fn(),
      leaveMeeting: vi.fn().mockResolvedValue(undefined),
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
      expect.objectContaining({ status: "completed" })
    );
  });

  it("stops joining meeting without botId", async () => {
    mockDb.where
      .mockResolvedValueOnce([fakeMeeting({ status: "joining", metadata: {} })])
      .mockResolvedValueOnce(undefined);

    const req = createJsonRequest("http://localhost/api/agent/stop", {
      method: "POST",
      body: { meetingId: validUuid },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
    expect(mockProvider.leaveMeeting).not.toHaveBeenCalled();
  });
});
