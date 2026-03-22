const { mockGetRAGContext, mockFormatContext } = vi.hoisted(() => ({
  mockGetRAGContext: vi.fn().mockResolvedValue([]),
  mockFormatContext: vi.fn().mockReturnValue(""),
}));

vi.mock("@/lib/agent/rag", () => ({
  getRAGContext: mockGetRAGContext,
  formatContextForPrompt: mockFormatContext,
}));

// Mock the AI SDK streamText
const mockStreamText = vi.hoisted(() =>
  vi.fn().mockReturnValue({
    toUIMessageStreamResponse: () =>
      new Response("streamed", {
        headers: { "Content-Type": "text/event-stream" },
      }),
  })
);

vi.mock("ai", () => ({
  streamText: mockStreamText,
  convertToModelMessages: vi.fn().mockResolvedValue([]),
  stepCountIs: vi.fn().mockReturnValue(() => false),
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn().mockReturnValue("mock-model"),
}));

import { POST } from "./route";
import { createJsonRequest, parseJsonResponse } from "@/test/helpers";

const URL = "http://localhost/api/agent/chat";

describe("POST /api/agent/chat", () => {
  beforeEach(() => {
    mockStreamText.mockClear();
    mockGetRAGContext.mockReset().mockResolvedValue([]);
    mockFormatContext.mockReset().mockReturnValue("");
  });

  it("calls streamText with correct model and system prompt", async () => {
    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        messages: [{ role: "user", content: "What was discussed?" }],
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "mock-model",
        system: expect.stringContaining("KiviKova"),
      })
    );
  });

  it("includes searchMeetingContext tool", async () => {
    const req = createJsonRequest(URL, {
      method: "POST",
      body: { messages: [{ role: "user", content: "test" }] },
    });

    await POST(req);

    const call = mockStreamText.mock.calls[0][0];
    expect(call.tools).toHaveProperty("searchMeetingContext");
    expect(call.tools.searchMeetingContext).toHaveProperty("execute");
    expect(call.tools.searchMeetingContext).toHaveProperty("description");
  });

  it("tool execute calls getRAGContext with userId", async () => {
    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        messages: [{ role: "user", content: "test" }],
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      },
    });

    await POST(req);

    // Execute the tool manually to test RAG integration
    const call = mockStreamText.mock.calls[0][0];
    const toolExecute = call.tools.searchMeetingContext.execute;

    mockFormatContext.mockReturnValueOnce("## Context\nSome data");
    await toolExecute({ query: "what was decided" });

    expect(mockGetRAGContext).toHaveBeenCalledWith("what was decided", {
      userId: "b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22",
      meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      boostMeetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    });
  });

  it("tool execute works without meetingId (cross-meeting)", async () => {
    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        messages: [{ role: "user", content: "test" }],
      },
    });

    await POST(req);

    const call = mockStreamText.mock.calls[0][0];
    await call.tools.searchMeetingContext.execute({ query: "search all" });

    expect(mockGetRAGContext).toHaveBeenCalledWith("search all", {
      userId: "b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22",
    });
  });

  it("returns streaming response", async () => {
    const req = createJsonRequest(URL, {
      method: "POST",
      body: { messages: [{ role: "user", content: "hi" }] },
    });

    const res = await POST(req);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
  });
});
