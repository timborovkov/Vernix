const { mockGetRAGContext, mockFormatContext, mockChatCreate, mockDb } =
  vi.hoisted(() => {
    const db: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const m of ["select", "from", "where"]) {
      db[m] = vi.fn().mockImplementation(() => db);
    }
    db.where.mockResolvedValue([{ metadata: {} }]);
    return {
      mockGetRAGContext: vi.fn().mockResolvedValue([]),
      mockFormatContext: vi.fn().mockReturnValue(""),
      mockChatCreate: vi.fn().mockResolvedValue({
        choices: [{ message: { content: "Test answer" } }],
      }),
      mockDb: db,
    };
  });

vi.mock("@/lib/agent/rag", () => ({
  getRAGContext: mockGetRAGContext,
  formatContextForPrompt: mockFormatContext,
  MeetingNotFoundError: class MeetingNotFoundError extends Error {
    constructor(id: string) {
      super(`Meeting not found: ${id}`);
      this.name = "MeetingNotFoundError";
    }
  },
}));
vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/openai/client", () => ({
  getOpenAIClient: () => ({
    chat: { completions: { create: mockChatCreate } },
  }),
}));

import { POST } from "./route";
import { MeetingNotFoundError } from "@/lib/agent/rag";
import { createJsonRequest, parseJsonResponse } from "@/test/helpers";

const URL = "http://localhost/api/agent/respond";

describe("POST /api/agent/respond", () => {
  it("returns 400 on malformed JSON body", async () => {
    const req = new Request(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
    expect(data.error).toMatch(/invalid json/i);
  });

  it("returns 400 on missing meetingId", async () => {
    const req = createJsonRequest(URL, {
      method: "POST",
      body: { question: "test" },
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
  });

  it("returns 400 on missing question", async () => {
    const req = createJsonRequest(URL, {
      method: "POST",
      body: { meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" },
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
  });

  it("returns 400 on invalid UUID", async () => {
    const req = createJsonRequest(URL, {
      method: "POST",
      body: { meetingId: "not-a-uuid", question: "test" },
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
  });

  it("returns 404 when meeting not found", async () => {
    mockGetRAGContext.mockRejectedValueOnce(
      new MeetingNotFoundError("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11")
    );

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        question: "test",
      },
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(404);
  });

  it("returns 200 with answer and sources on success", async () => {
    const sources = [
      {
        text: "context",
        speaker: "Alice",
        timestampMs: 1000,
        score: 0.9,
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      },
    ];
    mockGetRAGContext.mockResolvedValueOnce(sources);
    mockFormatContext.mockReturnValueOnce("[Alice] (1000ms): context");
    mockChatCreate.mockResolvedValueOnce({
      choices: [{ message: { content: "The answer" } }],
    });

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        question: "What was said?",
      },
    });
    const { status, data } = await parseJsonResponse(await POST(req));

    expect(status).toBe(200);
    expect(data.answer).toBe("The answer");
    expect(data.sources).toHaveLength(1);
    expect(data.sources[0].text).toBe("context");
  });

  it("passes meetingId to getRAGContext", async () => {
    const meetingId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

    const req = createJsonRequest(URL, {
      method: "POST",
      body: { meetingId, question: "test" },
    });
    await POST(req);

    expect(mockGetRAGContext).toHaveBeenCalledWith("test", {
      meetingId,
      userId: "b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22",
    });
  });

  it("includes RAG context in system prompt", async () => {
    mockFormatContext.mockReturnValueOnce("## Context\nSome context");

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        question: "test",
      },
    });
    await POST(req);

    const callArgs = mockChatCreate.mock.calls[0][0];
    expect(callArgs.messages[0].content).toContain("## Context\nSome context");
  });

  it("returns 500 when chat completion throws", async () => {
    mockChatCreate.mockRejectedValueOnce(new Error("LLM down"));

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        question: "test",
      },
    });
    const { status, data } = await parseJsonResponse(await POST(req));

    expect(status).toBe(500);
    expect(data.error).toMatch(/failed/i);
  });
});
