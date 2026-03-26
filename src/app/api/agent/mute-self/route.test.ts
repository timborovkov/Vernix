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

import { POST } from "./route";
import { createJsonRequest, parseJsonResponse } from "@/test/helpers";

const URL = "http://localhost/api/agent/mute-self";

describe("POST /api/agent/mute-self", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset rate limiter to avoid hitting limit across tests
    const { resetRateLimitKey } = await import("@/lib/rate-limit");
    resetRateLimitKey("agent:mute-self:unknown");
  });

  it("returns 400 on missing fields", async () => {
    const req = createJsonRequest(URL, { method: "POST", body: {} });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
  });

  it("returns 404 for unknown meeting", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        botSecret: "secret",
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
      },
    ]);

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        botSecret: "wrong",
      },
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(403);
  });

  it("mutes meeting with voiceSecret auth", async () => {
    mockDb.where
      .mockResolvedValueOnce([
        {
          id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          userId: "user-1",
          status: "active",
          metadata: { voiceSecret: "valid-secret", botId: "bot-1" },
        },
      ])
      .mockResolvedValueOnce([{ id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" }]);

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
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ muted: true }),
      })
    );
  });

  it("accepts botId as auth for silent mode", async () => {
    mockDb.where
      .mockResolvedValueOnce([
        {
          id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          userId: "user-1",
          status: "active",
          metadata: { botId: "bot-1", silent: true },
        },
      ])
      .mockResolvedValueOnce([{ id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" }]);

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

  it("rejects non-active meeting", async () => {
    mockDb.where.mockResolvedValueOnce([
      {
        id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        userId: "user-1",
        status: "completed",
        metadata: { voiceSecret: "valid-secret" },
      },
    ]);

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        botSecret: "valid-secret",
      },
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(404);
  });

  it("preserves existing metadata when setting muted flag", async () => {
    mockDb.where
      .mockResolvedValueOnce([
        {
          id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          userId: "user-1",
          status: "active",
          metadata: {
            voiceSecret: "valid-secret",
            botId: "bot-1",
            agenda: "Review Q1 goals",
          },
        },
      ])
      .mockResolvedValueOnce([{ id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" }]);

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        botSecret: "valid-secret",
      },
    });
    await POST(req);

    const setArg = mockDb.set.mock.calls[0][0];
    expect(setArg.metadata).toEqual({
      voiceSecret: "valid-secret",
      botId: "bot-1",
      agenda: "Review Q1 goals",
      muted: true,
    });
  });

  it("returns 429 when rate limit is exceeded", async () => {
    const { resetRateLimitKey } = await import("@/lib/rate-limit");
    resetRateLimitKey("agent:mute-self:unknown");

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

    // 6th request should be rate limited
    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        botSecret: "secret",
      },
    });
    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(429);
    expect(data.error).toContain("Too many requests");
  });
});
