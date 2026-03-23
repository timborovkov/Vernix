const { mockRt, mockCreate, mockGetRAGContext, mockFormatContext } = vi.hoisted(
  () => {
    const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};
    const rt = {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        if (!handlers[event]) handlers[event] = [];
        handlers[event].push(handler);
      }),
      send: vi.fn(),
      close: vi.fn(),
      _trigger: (event: string, data?: unknown) => {
        for (const h of handlers[event] ?? []) {
          h(data);
        }
      },
      _resetHandlers: () => {
        for (const key of Object.keys(handlers)) {
          delete handlers[key];
        }
      },
    };

    return {
      mockRt: rt,
      mockCreate: vi.fn().mockResolvedValue(rt),
      mockGetRAGContext: vi.fn().mockResolvedValue([]),
      mockFormatContext: vi.fn().mockReturnValue(""),
    };
  }
);

vi.mock("openai/realtime/websocket", () => ({
  OpenAIRealtimeWebSocket: { create: mockCreate },
}));
vi.mock("@/lib/openai/client", () => ({
  getOpenAIClient: () => ({ apiKey: "test" }),
}));
vi.mock("@/lib/agent/rag", () => ({
  getRAGContext: mockGetRAGContext,
  formatContextForPrompt: mockFormatContext,
}));

import { VoiceSession } from "./voice";

describe("VoiceSession", () => {
  const userId = "00000000-0000-0000-0000-000000000001";

  beforeEach(() => {
    mockRt._resetHandlers();
    mockRt.send.mockClear();
    mockRt.close.mockClear();
    mockCreate.mockClear();
    mockGetRAGContext.mockClear();
    mockFormatContext.mockClear();
  });

  it("connect() calls create with correct model", async () => {
    const session = new VoiceSession({
      meetingId: "m1",
      userId,
      model: "gpt-realtime-mini",
    });
    await session.connect();

    expect(mockCreate).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ model: "gpt-realtime-mini" })
    );
  });

  it("connect() sends session.update on session.created", async () => {
    const session = new VoiceSession({ meetingId: "m1", userId });
    await session.connect();

    mockRt._trigger("session.created");

    expect(mockRt.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "session.update",
        session: expect.objectContaining({
          instructions: expect.any(String),
          tools: expect.arrayContaining([
            expect.objectContaining({ name: "search_meeting_context" }),
          ]),
        }),
      })
    );
  });

  it("emits connected on session.updated", async () => {
    const session = new VoiceSession({ meetingId: "m1", userId });
    const events: unknown[] = [];
    session.on((e) => events.push(e));
    await session.connect();

    mockRt._trigger("session.updated");

    expect(events).toContainEqual({ type: "connected" });
  });

  it("sendAudio() sends input_audio_buffer.append", async () => {
    const session = new VoiceSession({ meetingId: "m1", userId });
    await session.connect();

    session.sendAudio("base64data");

    expect(mockRt.send).toHaveBeenCalledWith({
      type: "input_audio_buffer.append",
      audio: "base64data",
    });
  });

  it("sendText() sends conversation.item.create and response.create", async () => {
    const session = new VoiceSession({ meetingId: "m1", userId });
    await session.connect();

    session.sendText("Hello");

    expect(mockRt.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "conversation.item.create",
        item: expect.objectContaining({
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: "Hello" }],
        }),
      })
    );
    expect(mockRt.send).toHaveBeenCalledWith({ type: "response.create" });
  });

  it("handles function call by calling getRAGContext and submitting output", async () => {
    const session = new VoiceSession({ meetingId: "m1", userId });
    await session.connect();
    mockFormatContext.mockReturnValueOnce("## Context\nSome text");

    await mockRt._trigger("response.function_call_arguments.done", {
      name: "search_meeting_context",
      arguments: JSON.stringify({ query: "test query" }),
      call_id: "call_123",
    });

    // Wait for async handler
    await vi.waitFor(() => {
      expect(mockGetRAGContext).toHaveBeenCalledWith("test query", {
        userId,
        boostMeetingId: "m1",
      });
    });

    expect(mockRt.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "conversation.item.create",
        item: expect.objectContaining({
          type: "function_call_output",
          call_id: "call_123",
          output: "## Context\nSome text",
        }),
      })
    );
    expect(mockRt.send).toHaveBeenCalledWith({ type: "response.create" });
  });

  it("emits audio_delta on response.output_audio.delta", async () => {
    const session = new VoiceSession({ meetingId: "m1", userId });
    const events: unknown[] = [];
    session.on((e) => events.push(e));
    await session.connect();

    mockRt._trigger("response.output_audio.delta", { delta: "audiodata" });

    expect(events).toContainEqual({ type: "audio_delta", delta: "audiodata" });
  });

  it("emits text_done on response.output_text.done", async () => {
    const session = new VoiceSession({ meetingId: "m1", userId });
    const events: unknown[] = [];
    session.on((e) => events.push(e));
    await session.connect();

    mockRt._trigger("response.output_text.done", { text: "Full text" });

    expect(events).toContainEqual({ type: "text_done", text: "Full text" });
  });

  it("emits error on realtime error", async () => {
    const session = new VoiceSession({ meetingId: "m1", userId });
    const events: unknown[] = [];
    session.on((e) => events.push(e));
    await session.connect();

    mockRt._trigger("error", { message: "Connection lost" });

    expect(events).toContainEqual({
      type: "error",
      message: "Connection lost",
    });
  });

  it("close() closes WebSocket and emits closed", async () => {
    const session = new VoiceSession({ meetingId: "m1", userId });
    const events: unknown[] = [];
    session.on((e) => events.push(e));
    await session.connect();

    session.close();

    expect(mockRt.close).toHaveBeenCalled();
    expect(events).toContainEqual({ type: "closed" });
  });

  it("connect() closes existing WebSocket before creating new one", async () => {
    const session = new VoiceSession({ meetingId: "m1", userId });
    await session.connect();

    // Connect again — should close the previous connection first
    await session.connect();

    expect(mockRt.close).toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });
});
