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

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/vector/upsert", () => ({
  upsertTranscriptChunk: mockUpsert,
}));

import { POST } from "./route";
import {
  createJsonRequest,
  parseJsonResponse,
  fakeMeeting,
} from "@/test/helpers";

function fakePayload(overrides?: Record<string, unknown>) {
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

  it("returns 400 when meeting is not active", async () => {
    mockDb.where.mockResolvedValueOnce([fakeMeeting({ status: "completed" })]);

    const req = createJsonRequest(
      "http://localhost/api/webhooks/recall/transcript",
      {
        method: "POST",
        body: fakePayload(),
      }
    );
    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
    expect(data.error).toMatch(/not active/i);
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
});
