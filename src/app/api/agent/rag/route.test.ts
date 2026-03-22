const { mockDb, mockGetRAGContext, mockFormatContext } = vi.hoisted(() => {
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
    mockGetRAGContext: vi.fn().mockResolvedValue([]),
    mockFormatContext: vi.fn().mockReturnValue(""),
  };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/agent/rag", () => ({
  getRAGContext: mockGetRAGContext,
  formatContextForPrompt: mockFormatContext,
  MeetingNotFoundError: class extends Error {},
  EmbeddingError: class extends Error {},
}));

import { POST } from "./route";
import { createJsonRequest, parseJsonResponse } from "@/test/helpers";

const URL = "http://localhost/api/agent/rag";

describe("POST /api/agent/rag", () => {
  beforeEach(() => {
    mockDb.where.mockReset();
    mockGetRAGContext.mockReset().mockResolvedValue([]);
    mockFormatContext.mockReset().mockReturnValue("");
  });

  it("returns 400 on missing fields", async () => {
    const req = createJsonRequest(URL, {
      method: "POST",
      body: { query: "test" },
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
  });

  it("returns context not found for unknown meeting", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        botSecret: "secret-123",
        query: "test",
      },
    });
    const { data } = await parseJsonResponse(await POST(req));
    expect(data.context).toBe("Meeting not found.");
  });

  it("returns 403 on invalid botSecret", async () => {
    mockDb.where.mockResolvedValueOnce([
      {
        userId: "user-1",
        metadata: { voiceSecret: "correct-secret" },
      },
    ]);

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        botSecret: "wrong-secret",
        query: "test",
      },
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(403);
  });

  it("returns RAG context on valid request", async () => {
    mockDb.where.mockResolvedValueOnce([
      {
        userId: "user-1",
        metadata: { voiceSecret: "valid-secret" },
      },
    ]);
    mockFormatContext.mockReturnValueOnce("## Context\nSome meeting data");

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        botSecret: "valid-secret",
        query: "what was discussed",
      },
    });
    const { status, data } = await parseJsonResponse(await POST(req));

    expect(status).toBe(200);
    expect(data.context).toBe("## Context\nSome meeting data");
    expect(mockGetRAGContext).toHaveBeenCalledWith("what was discussed", {
      userId: "user-1",
      boostMeetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    });
  });
});
