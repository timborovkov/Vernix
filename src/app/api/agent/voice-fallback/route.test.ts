const {
  mockDb,
  mockVerifyBotSecret,
  mockGenerateAgentResponse,
  mockSendChatMessage,
  mockLeaveMeeting,
  mockProcessMeetingEnd,
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
    mockVerifyBotSecret: vi.fn().mockReturnValue(true),
    mockGenerateAgentResponse: vi
      .fn()
      .mockResolvedValue({ text: "Response text" }),
    mockSendChatMessage: vi.fn().mockResolvedValue(undefined),
    mockLeaveMeeting: vi.fn().mockResolvedValue(undefined),
    mockProcessMeetingEnd: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/db/schema", () => ({
  meetings: {
    id: "id",
    status: "status",
    userId: "userId",
  },
}));
vi.mock("@/lib/agent/verify-bot-secret", () => ({
  verifyBotSecret: mockVerifyBotSecret,
}));
vi.mock("@/lib/agent/response", () => ({
  generateAgentResponse: mockGenerateAgentResponse,
}));
vi.mock("@/lib/meeting-bot", () => ({
  getMeetingBotProvider: () => ({
    sendChatMessage: mockSendChatMessage,
    leaveMeeting: mockLeaveMeeting,
  }),
}));
vi.mock("@/lib/agent/processing", () => ({
  processMeetingEnd: mockProcessMeetingEnd,
}));

import { POST } from "./route";
import {
  createJsonRequest,
  parseJsonResponse,
  fakeMeeting,
} from "@/test/helpers";

const URL = "http://localhost/api/agent/voice-fallback";

function activeMeeting(overrides: Record<string, unknown> = {}) {
  return fakeMeeting({
    status: "active",
    userId: "user-1",
    metadata: { voiceSecret: "valid-secret", botId: "bot-1" },
    ...overrides,
  });
}

describe("POST /api/agent/voice-fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyBotSecret.mockReturnValue(true);
    mockGenerateAgentResponse.mockResolvedValue({ text: "Response text" });
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new Request(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
    expect(data.error).toBe("Invalid JSON body");
  });

  it("returns 404 when meeting not found", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        botSecret: "valid-secret",
        transcriptWindow: "Hello everyone",
      },
    });
    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(404);
    expect(data.error).toBe("Meeting not found or not active");
  });

  it("returns 403 for invalid bot secret", async () => {
    mockDb.where.mockResolvedValueOnce([activeMeeting()]);
    mockVerifyBotSecret.mockReturnValue(false);

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        botSecret: "wrong-secret",
        transcriptWindow: "Hello everyone",
      },
    });
    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(403);
    expect(data.error).toBe("Invalid bot secret");
  });

  it("returns 400 when no transcript provided", async () => {
    mockDb.where.mockResolvedValueOnce([activeMeeting()]);

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        botSecret: "valid-secret",
      },
    });
    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
    expect(data.error).toBe("No transcript context provided");
  });

  it("successfully generates and sends fallback response", async () => {
    mockDb.where.mockResolvedValueOnce([activeMeeting()]);

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        botSecret: "valid-secret",
        transcriptWindow: "Can you summarize what we discussed?",
      },
    });
    const { status, data } = await parseJsonResponse(await POST(req));

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockGenerateAgentResponse).toHaveBeenCalledWith(
      "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      "user-1",
      "Can you summarize what we discussed?",
      undefined
    );
    expect(mockSendChatMessage).toHaveBeenCalledWith("bot-1", "Response text");
  });

  it("handles leave tool call result", async () => {
    mockDb.where.mockResolvedValueOnce([activeMeeting()]);
    mockGenerateAgentResponse.mockResolvedValueOnce({
      text: "Goodbye!",
      leave: true,
    });

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        botSecret: "valid-secret",
        transcriptWindow: "Vernix please leave the call",
      },
    });
    const { status, data } = await parseJsonResponse(await POST(req));

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockSendChatMessage).toHaveBeenCalledWith("bot-1", "Goodbye!");
    expect(mockLeaveMeeting).toHaveBeenCalledWith("bot-1");
    expect(mockDb.update).toHaveBeenCalled();
    expect(mockProcessMeetingEnd).toHaveBeenCalledWith(
      "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      "user-1",
      "meeting_test123",
      expect.objectContaining({ title: "Test Meeting" })
    );
  });

  it("handles mute_self tool call result", async () => {
    mockDb.where.mockResolvedValueOnce([activeMeeting()]);
    mockGenerateAgentResponse.mockResolvedValueOnce({
      text: "I'll be quiet now.",
      mute: true,
    });

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        botSecret: "valid-secret",
        transcriptWindow: "Vernix please mute yourself",
      },
    });
    const { status, data } = await parseJsonResponse(await POST(req));

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockSendChatMessage).toHaveBeenCalledWith(
      "bot-1",
      "I'll be quiet now."
    );
    expect(mockDb.update).toHaveBeenCalled();
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ muted: true }),
      })
    );
    // Should NOT leave or process meeting end
    expect(mockLeaveMeeting).not.toHaveBeenCalled();
    expect(mockProcessMeetingEnd).not.toHaveBeenCalled();
  });
});
