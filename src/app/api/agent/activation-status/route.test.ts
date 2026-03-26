const { mockDb } = vi.hoisted(() => {
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
  return { mockDb: db };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));

const { mockGetActivationState, mockSetActivationState } = vi.hoisted(() => ({
  mockGetActivationState: vi
    .fn()
    .mockResolvedValue({ state: "idle", muted: false }),
  mockSetActivationState: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/agent/activation", () => ({
  getActivationState: mockGetActivationState,
  setActivationState: mockSetActivationState,
}));

import { POST } from "./route";
import { createJsonRequest, parseJsonResponse } from "@/test/helpers";

const URL = "http://localhost/api/agent/activation-status";

describe("POST /api/agent/activation-status", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { resetRateLimitKey } = await import("@/lib/rate-limit");
    resetRateLimitKey("agent:activation-status:unknown");
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

  it("returns 400 for missing meetingId", async () => {
    const req = createJsonRequest(URL, {
      method: "POST",
      body: { botSecret: "secret" },
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
  });

  it("returns 404 when meeting not found", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        botSecret: "secret",
      },
    });
    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(404);
    expect(data.error).toBe("Meeting not found");
  });

  it("returns 403 for invalid bot secret", async () => {
    mockDb.where.mockResolvedValueOnce([
      {
        metadata: { voiceSecret: "correct-secret", botId: "bot-1" },
        userId: "user-1",
      },
    ]);

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        botSecret: "wrong-secret",
      },
    });
    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(403);
    expect(data.error).toBe("Invalid bot secret");
  });

  it("returns activation state successfully", async () => {
    mockDb.where.mockResolvedValueOnce([
      {
        metadata: { voiceSecret: "valid-secret", botId: "bot-1" },
        userId: "user-1",
      },
    ]);
    mockGetActivationState.mockResolvedValueOnce({
      state: "activated",
      muted: false,
      transcriptWindow: "Alice: hello",
    });

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        botSecret: "valid-secret",
      },
    });
    const { status, data } = await parseJsonResponse(await POST(req));

    expect(status).toBe(200);
    expect(data.state).toBe("activated");
    expect(data.muted).toBe(false);
    expect(data.transcriptWindow).toBe("Alice: hello");
    expect(mockSetActivationState).not.toHaveBeenCalled();
  });

  it("updates state when state param provided", async () => {
    mockDb.where.mockResolvedValueOnce([
      {
        metadata: { voiceSecret: "valid-secret", botId: "bot-1" },
        userId: "user-1",
      },
    ]);
    mockGetActivationState.mockResolvedValueOnce({
      state: "responding",
      muted: false,
    });

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        botSecret: "valid-secret",
        state: "responding",
      },
    });
    const { status, data } = await parseJsonResponse(await POST(req));

    expect(status).toBe(200);
    expect(data.state).toBe("responding");
    expect(mockSetActivationState).toHaveBeenCalledWith(
      "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      "user-1",
      "responding"
    );
  });

  it("rate limits requests", async () => {
    const { rateLimit: rateLimitFn } = await import("@/lib/rate-limit");

    // Exhaust the rate limit
    for (let i = 0; i < 120; i++) {
      rateLimitFn("agent:activation-status:unknown", {
        interval: 60_000,
        limit: 120,
      });
    }

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        botSecret: "valid-secret",
      },
    });
    const { status, data } = await parseJsonResponse(await POST(req));

    expect(status).toBe(429);
    expect(data.error).toBe("Too many requests");
  });
});
