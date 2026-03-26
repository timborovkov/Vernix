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
import { resetRateLimits } from "@/lib/rate-limit";

const URL = "http://localhost/api/agent/switch-mode";

describe("POST /api/agent/switch-mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimits();
  });

  it("returns 400 on missing fields", async () => {
    const req = createJsonRequest(URL, {
      method: "POST",
      body: {},
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
        metadata: { voiceSecret: "correct-secret" },
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

  it("switches to silent mode on valid request", async () => {
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
        metadata: expect.objectContaining({
          silent: true,
          voiceSecret: null,
        }),
      })
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
    expect(status).toBe(400);
  });
});
