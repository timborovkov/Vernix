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

import { GET } from "./route";
import { parseJsonResponse } from "@/test/helpers";

const BASE_URL = "http://localhost/api/agent/mute-status";

describe("GET /api/agent/mute-status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 on missing params", async () => {
    const req = new Request(BASE_URL);
    const { status } = await parseJsonResponse(await GET(req));
    expect(status).toBe(400);
  });

  it("returns 404 for unknown meeting", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    const req = new Request(
      `${BASE_URL}?meetingId=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11&botSecret=secret`
    );
    const { status } = await parseJsonResponse(await GET(req));
    expect(status).toBe(404);
  });

  it("returns 403 on invalid botSecret", async () => {
    mockDb.where.mockResolvedValueOnce([
      { metadata: { voiceSecret: "correct-secret" } },
    ]);

    const req = new Request(
      `${BASE_URL}?meetingId=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11&botSecret=wrong`
    );
    const { status } = await parseJsonResponse(await GET(req));
    expect(status).toBe(403);
  });

  it("returns muted: false for non-muted meeting", async () => {
    mockDb.where.mockResolvedValueOnce([
      { metadata: { voiceSecret: "valid-secret" } },
    ]);

    const req = new Request(
      `${BASE_URL}?meetingId=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11&botSecret=valid-secret`
    );
    const { status, data } = await parseJsonResponse(await GET(req));
    expect(status).toBe(200);
    expect(data.muted).toBe(false);
  });

  it("returns muted: true for muted meeting", async () => {
    mockDb.where.mockResolvedValueOnce([
      { metadata: { voiceSecret: "valid-secret", muted: true } },
    ]);

    const req = new Request(
      `${BASE_URL}?meetingId=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11&botSecret=valid-secret`
    );
    const { status, data } = await parseJsonResponse(await GET(req));
    expect(status).toBe(200);
    expect(data.muted).toBe(true);
  });

  it("accepts botId as auth for silent mode", async () => {
    mockDb.where.mockResolvedValueOnce([
      { metadata: { botId: "bot-1", silent: true, muted: true } },
    ]);

    const req = new Request(
      `${BASE_URL}?meetingId=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11&botSecret=bot-1`
    );
    const { status, data } = await parseJsonResponse(await GET(req));
    expect(status).toBe(200);
    expect(data.muted).toBe(true);
  });
});
