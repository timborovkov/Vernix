const { mockDb, mockUpsert } = vi.hoisted(() => {
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
    mockUpsert: vi.fn().mockResolvedValue("point-id-1"),
  };
});

const mockHandleVoiceTranscript = vi.fn();
const mockHandleSilentTranscript = vi.fn();

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/vector/upsert", () => ({
  upsertTranscriptChunk: mockUpsert,
}));
vi.mock("@/lib/agent/activation", () => ({
  handleVoiceTranscript: mockHandleVoiceTranscript,
}));
vi.mock("@/lib/agent/silent", () => ({
  handleSilentTranscript: mockHandleSilentTranscript,
}));

import { POST } from "./route";
import {
  createJsonRequest,
  parseJsonResponse,
  fakeMeeting,
} from "@/test/helpers";

function fakeLegacyPayload(overrides?: Record<string, unknown>) {
  return {
    bot_id: "recall-bot-123",
    transcript: {
      original_transcript_id: 1,
      speaker: "Alice",
      speaker_id: 1,
      words: [
        { text: "Hello", start_time: 1.5, end_time: 2.0 },
        { text: "world", start_time: 2.0, end_time: 2.5 },
      ],
      is_final: true,
      language: "en",
    },
    ...overrides,
  };
}

function fakeNewPayload(overrides?: Record<string, unknown>) {
  return {
    event: "transcript.data",
    data: {
      data: {
        words: [
          {
            text: "Hello",
            start_timestamp: { relative: 1.5 },
            end_timestamp: { relative: 2.0 },
          },
          {
            text: "world",
            start_timestamp: { relative: 2.0 },
            end_timestamp: { relative: 2.5 },
          },
        ],
        participant: { id: 1, name: "Alice" },
      },
      bot: { id: "recall-bot-123", metadata: {} },
    },
    ...overrides,
  };
}

// Default to legacy for existing tests
function fakePayload(overrides?: Record<string, unknown>) {
  return fakeLegacyPayload(overrides);
}

describe("POST /api/webhooks/recall/transcript", () => {
  it("returns 400 on malformed JSON body", async () => {
    const req = new Request("http://localhost/api/webhooks/recall/transcript", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
    expect(data.error).toMatch(/invalid json/i);
  });

  it("returns 400 on invalid payload", async () => {
    const req = createJsonRequest(
      "http://localhost/api/webhooks/recall/transcript",
      {
        method: "POST",
        body: {},
      }
    );
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
  });

  it("returns 200 with skipped:true for non-final transcript", async () => {
    const req = createJsonRequest(
      "http://localhost/api/webhooks/recall/transcript",
      {
        method: "POST",
        body: fakePayload({
          transcript: {
            original_transcript_id: 1,
            speaker: "Alice",
            speaker_id: 1,
            words: [{ text: "Hi", start_time: 0, end_time: 0.5 }],
            is_final: false,
            language: "en",
          },
        }),
      }
    );
    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(200);
    expect(data.skipped).toBe(true);
  });

  it("returns 200 with skipped:true for empty words array", async () => {
    const req = createJsonRequest(
      "http://localhost/api/webhooks/recall/transcript",
      {
        method: "POST",
        body: fakePayload({
          transcript: {
            original_transcript_id: 1,
            speaker: "Alice",
            speaker_id: 1,
            words: [],
            is_final: true,
            language: "en",
          },
        }),
      }
    );
    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(200);
    expect(data.skipped).toBe(true);
  });

  it("returns 404 when no meeting found for botId", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    const req = createJsonRequest(
      "http://localhost/api/webhooks/recall/transcript",
      {
        method: "POST",
        body: fakePayload(),
      }
    );
    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(404);
    expect(data.error).toMatch(/not found/i);
  });

  it("returns 400 when meeting is not in acceptable status", async () => {
    mockDb.where.mockResolvedValueOnce([fakeMeeting({ status: "pending" })]);

    const req = createJsonRequest(
      "http://localhost/api/webhooks/recall/transcript",
      {
        method: "POST",
        body: fakePayload(),
      }
    );
    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
    expect(data.error).toMatch(/does not accept/i);
  });

  it("calls upsertTranscriptChunk with correct args", async () => {
    const meeting = fakeMeeting({
      status: "active",
      qdrantCollectionName: "meeting_abc123",
    });
    mockDb.where.mockResolvedValueOnce([meeting]);

    const req = createJsonRequest(
      "http://localhost/api/webhooks/recall/transcript",
      {
        method: "POST",
        body: fakePayload(),
      }
    );
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledWith("meeting_abc123", {
      text: "Hello world",
      speaker: "Alice",
      timestampMs: 1500,
    });
  });

  it("updates participants atomically after upsert", async () => {
    const meeting = fakeMeeting({
      status: "active",
      participants: [],
    });
    mockDb.where
      .mockResolvedValueOnce([meeting])
      .mockResolvedValueOnce(undefined);

    const req = createJsonRequest(
      "http://localhost/api/webhooks/recall/transcript",
      {
        method: "POST",
        body: fakePayload(),
      }
    );
    const { status } = await parseJsonResponse(await POST(req));

    expect(status).toBe(200);
    // Atomic SQL update is called (CASE with @> containment check)
    expect(mockDb.update).toHaveBeenCalled();
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({
        updatedAt: expect.any(Date),
      })
    );
  });

  it("handles new transcript.data format", async () => {
    const meeting = fakeMeeting({
      status: "active",
      qdrantCollectionName: "meeting_new",
    });
    mockDb.where
      .mockResolvedValueOnce([meeting])
      .mockResolvedValueOnce(undefined);

    const req = createJsonRequest(
      "http://localhost/api/webhooks/recall/transcript",
      {
        method: "POST",
        body: fakeNewPayload(),
      }
    );
    const { status } = await parseJsonResponse(await POST(req));

    expect(status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledWith("meeting_new", {
      text: "Hello world",
      speaker: "Alice",
      timestampMs: 1500,
    });
  });

  it("uses fallback speaker name when participant name is null", async () => {
    const meeting = fakeMeeting({ status: "active" });
    mockDb.where
      .mockResolvedValueOnce([meeting])
      .mockResolvedValueOnce(undefined);

    const payload = fakeNewPayload();
    (payload.data as Record<string, unknown>).data = {
      words: [
        {
          text: "Hi",
          start_timestamp: { relative: 0.5 },
          end_timestamp: { relative: 1.0 },
        },
      ],
      participant: { id: 42, name: null },
    };

    const req = createJsonRequest(
      "http://localhost/api/webhooks/recall/transcript",
      { method: "POST", body: payload }
    );
    const { status } = await parseJsonResponse(await POST(req));

    expect(status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ speaker: "Vernix Agent" })
    );
  });

  it("skips new format with empty words", async () => {
    const payload = fakeNewPayload();
    (payload.data as Record<string, unknown>).data = {
      words: [],
      participant: { id: 1, name: "Alice" },
    };

    const req = createJsonRequest(
      "http://localhost/api/webhooks/recall/transcript",
      { method: "POST", body: payload }
    );
    const { status, data } = await parseJsonResponse(await POST(req));

    expect(status).toBe(200);
    expect(data.skipped).toBe(true);
  });

  it("returns 500 when upsert fails", async () => {
    mockDb.where.mockResolvedValueOnce([fakeMeeting({ status: "active" })]);
    mockUpsert.mockRejectedValueOnce(new Error("Qdrant down"));

    const req = createJsonRequest(
      "http://localhost/api/webhooks/recall/transcript",
      {
        method: "POST",
        body: fakePayload(),
      }
    );
    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(500);
    expect(data.error).toMatch(/failed/i);
  });

  it("triggers voice activation for non-silent active meetings", async () => {
    const meeting = fakeMeeting({
      status: "active",
      metadata: { botId: "recall-bot-123", silent: false },
    });
    mockDb.where
      .mockResolvedValueOnce([meeting])
      .mockResolvedValueOnce(undefined);

    const req = createJsonRequest(
      "http://localhost/api/webhooks/recall/transcript",
      { method: "POST", body: fakePayload() }
    );
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(200);

    // Wait for dynamic import to resolve
    await vi.dynamicImportSettled();

    expect(mockHandleVoiceTranscript).toHaveBeenCalledWith(
      meeting.id,
      meeting.userId,
      "recall-bot-123",
      "Alice",
      "Hello world",
      1500
    );
    expect(mockHandleSilentTranscript).not.toHaveBeenCalled();
  });

  it("triggers silent handler for silent-mode active meetings", async () => {
    const meeting = fakeMeeting({
      status: "active",
      metadata: { botId: "recall-bot-123", silent: true },
    });
    mockDb.where
      .mockResolvedValueOnce([meeting])
      .mockResolvedValueOnce(undefined);

    const req = createJsonRequest(
      "http://localhost/api/webhooks/recall/transcript",
      { method: "POST", body: fakePayload() }
    );
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(200);

    await vi.dynamicImportSettled();

    expect(mockHandleSilentTranscript).toHaveBeenCalledWith(
      meeting.id,
      meeting.userId,
      "recall-bot-123",
      "Alice",
      "Hello world",
      1500,
      null
    );
    expect(mockHandleVoiceTranscript).not.toHaveBeenCalled();
  });

  it("skips both handlers when speaker is Vernix Agent", async () => {
    const meeting = fakeMeeting({
      status: "active",
      metadata: { botId: "recall-bot-123", silent: false },
    });
    mockDb.where
      .mockResolvedValueOnce([meeting])
      .mockResolvedValueOnce(undefined);

    // Use new format with null participant name → becomes "Vernix Agent"
    const payload = fakeNewPayload();
    (payload.data as Record<string, unknown>).data = {
      words: [
        {
          text: "Hello",
          start_timestamp: { relative: 0.5 },
          end_timestamp: { relative: 1.0 },
        },
      ],
      participant: { id: 42, name: null },
    };

    const req = createJsonRequest(
      "http://localhost/api/webhooks/recall/transcript",
      { method: "POST", body: payload }
    );
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(200);

    await vi.dynamicImportSettled();

    expect(mockHandleVoiceTranscript).not.toHaveBeenCalled();
    expect(mockHandleSilentTranscript).not.toHaveBeenCalled();
  });

  it("skips both handlers when meeting is muted", async () => {
    const meeting = fakeMeeting({
      status: "active",
      metadata: { botId: "recall-bot-123", silent: false, muted: true },
    });
    mockDb.where
      .mockResolvedValueOnce([meeting])
      .mockResolvedValueOnce(undefined);

    const req = createJsonRequest(
      "http://localhost/api/webhooks/recall/transcript",
      { method: "POST", body: fakePayload() }
    );
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(200);

    await vi.dynamicImportSettled();

    expect(mockHandleVoiceTranscript).not.toHaveBeenCalled();
    expect(mockHandleSilentTranscript).not.toHaveBeenCalled();
  });

  it("skips both handlers when meeting has no userId", async () => {
    const meeting = fakeMeeting({
      status: "active",
      userId: null,
      metadata: { botId: "recall-bot-123", silent: false },
    });
    mockDb.where
      .mockResolvedValueOnce([meeting])
      .mockResolvedValueOnce(undefined);

    const req = createJsonRequest(
      "http://localhost/api/webhooks/recall/transcript",
      { method: "POST", body: fakePayload() }
    );
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(200);

    await vi.dynamicImportSettled();

    expect(mockHandleVoiceTranscript).not.toHaveBeenCalled();
    expect(mockHandleSilentTranscript).not.toHaveBeenCalled();
  });

  it("skips both handlers when metadata has no botId", async () => {
    const meeting = fakeMeeting({
      status: "active",
      metadata: { silent: false },
    });
    mockDb.where
      .mockResolvedValueOnce([meeting])
      .mockResolvedValueOnce(undefined);

    const req = createJsonRequest(
      "http://localhost/api/webhooks/recall/transcript",
      { method: "POST", body: fakePayload() }
    );
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(200);

    await vi.dynamicImportSettled();

    expect(mockHandleVoiceTranscript).not.toHaveBeenCalled();
    expect(mockHandleSilentTranscript).not.toHaveBeenCalled();
  });

  it("skips both handlers when meeting is not active", async () => {
    const meeting = fakeMeeting({
      status: "processing",
      metadata: { botId: "recall-bot-123", silent: false },
    });
    mockDb.where
      .mockResolvedValueOnce([meeting])
      .mockResolvedValueOnce(undefined);

    const req = createJsonRequest(
      "http://localhost/api/webhooks/recall/transcript",
      { method: "POST", body: fakePayload() }
    );
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(200);

    await vi.dynamicImportSettled();

    expect(mockHandleVoiceTranscript).not.toHaveBeenCalled();
    expect(mockHandleSilentTranscript).not.toHaveBeenCalled();
  });
});
