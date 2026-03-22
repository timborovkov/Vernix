const { mockDb, mockOpenAIClient } = vi.hoisted(() => {
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
  const client = {
    realtime: {
      clientSecrets: {
        create: vi.fn().mockResolvedValue({
          value: "ek_test_token",
          expires_at: 9999999999,
          session: {},
        }),
      },
    },
  };
  return { mockDb: db, mockOpenAIClient: client };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/openai/client", () => ({
  getOpenAIClient: () => mockOpenAIClient,
}));

import { GET } from "./route";
import { parseJsonResponse, fakeMeeting } from "@/test/helpers";

describe("GET /api/agent/voice-token", () => {
  beforeEach(() => {
    mockDb.where.mockReset();
    mockOpenAIClient.realtime.clientSecrets.create
      .mockReset()
      .mockResolvedValue({
        value: "ek_test_token",
        expires_at: 9999999999,
        session: {},
      });
  });

  it("returns 400 without meetingId", async () => {
    const req = new Request("http://localhost/api/agent/voice-token");
    const { status } = await parseJsonResponse(await GET(req));
    expect(status).toBe(400);
  });

  it("returns 400 without botSecret", async () => {
    const req = new Request(
      "http://localhost/api/agent/voice-token?meetingId=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
    );
    const { status } = await parseJsonResponse(await GET(req));
    expect(status).toBe(400);
  });

  it("returns 404 for non-existent meeting", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    const req = new Request(
      "http://localhost/api/agent/voice-token?meetingId=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11&botSecret=secret"
    );
    const { status } = await parseJsonResponse(await GET(req));
    expect(status).toBe(404);
  });

  it("returns 403 on invalid botSecret", async () => {
    mockDb.where.mockResolvedValueOnce([
      fakeMeeting({
        status: "active",
        metadata: { voiceSecret: "correct-secret" },
      }),
    ]);

    const req = new Request(
      "http://localhost/api/agent/voice-token?meetingId=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11&botSecret=wrong"
    );
    const { status } = await parseJsonResponse(await GET(req));
    expect(status).toBe(403);
  });

  it("returns token on valid request", async () => {
    mockDb.where.mockResolvedValueOnce([
      fakeMeeting({
        status: "active",
        metadata: { voiceSecret: "valid-secret" },
      }),
    ]);

    const req = new Request(
      "http://localhost/api/agent/voice-token?meetingId=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11&botSecret=valid-secret"
    );
    const { status, data } = await parseJsonResponse(await GET(req));

    expect(status).toBe(200);
    expect(data.token).toBe("ek_test_token");
    expect(data.meetingId).toBe("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11");
  });
});
