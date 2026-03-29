const { mockDb, mockScrollTranscript, mockGenerateSummary } = vi.hoisted(() => {
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
    mockScrollTranscript: vi.fn().mockResolvedValue([]),
    mockGenerateSummary: vi.fn().mockResolvedValue("Generated summary"),
  };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/vector/scroll", () => ({
  scrollTranscript: mockScrollTranscript,
}));
vi.mock("@/lib/summary/generate", () => ({
  generateMeetingSummary: mockGenerateSummary,
}));
vi.mock("@/lib/tasks/extract", () => ({
  extractActionItems: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/tasks/store", () => ({
  storeExtractedTasks: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "./route";
import {
  createJsonRequest,
  parseJsonResponse,
  fakeMeeting,
} from "@/test/helpers";

const URL = "http://localhost/api/webhooks/recall/status";

function statusPayload(event: string, botId: string) {
  return {
    event,
    data: {
      bot: { id: botId, metadata: {} },
    },
  };
}

describe("POST /api/webhooks/recall/status", () => {
  beforeEach(() => {
    mockDb.where.mockReset();
    mockDb.set.mockReset().mockImplementation(() => mockDb);
    mockScrollTranscript.mockReset().mockResolvedValue([]);
    mockGenerateSummary.mockReset().mockResolvedValue("Generated summary");
  });

  it("returns 400 on malformed JSON", async () => {
    const req = new Request(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
  });

  it("acknowledges unrecognized event formats with 200", async () => {
    const req = createJsonRequest(URL, {
      method: "POST",
      body: { foo: "bar" },
    });
    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(200);
    expect(data.skipped).toBe(true);
  });

  it("skips unhandled events", async () => {
    const req = createJsonRequest(URL, {
      method: "POST",
      body: statusPayload("bot.joining_call", "bot-1"),
    });
    const { data } = await parseJsonResponse(await POST(req));
    expect(data.skipped).toBe(true);
  });

  it("sets meeting to processing on bot.call_ended", async () => {
    mockDb.where
      .mockResolvedValueOnce([
        fakeMeeting({ status: "active", metadata: { botId: "bot-1" } }),
      ])
      .mockResolvedValueOnce(undefined);

    const req = createJsonRequest(URL, {
      method: "POST",
      body: statusPayload("bot.call_ended", "bot-1"),
    });
    const { status } = await parseJsonResponse(await POST(req));

    expect(status).toBe(200);
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "processing" })
    );
  });

  it("skips bot.call_ended for completed meetings", async () => {
    mockDb.where.mockResolvedValueOnce([fakeMeeting({ status: "completed" })]);

    const req = createJsonRequest(URL, {
      method: "POST",
      body: statusPayload("bot.call_ended", "bot-1"),
    });
    const { data } = await parseJsonResponse(await POST(req));
    expect(data.skipped).toBe(true);
  });

  it("generates summary on transcript.done", async () => {
    const segments = [{ text: "Hello", speaker: "Alice", timestampMs: 1000 }];
    mockScrollTranscript.mockResolvedValueOnce(segments);
    mockGenerateSummary.mockResolvedValueOnce("Summary text");
    mockDb.where
      .mockResolvedValueOnce([
        fakeMeeting({
          status: "processing",
          metadata: { botId: "bot-1" },
        }),
      ])
      .mockResolvedValueOnce(undefined);

    const req = createJsonRequest(URL, {
      method: "POST",
      body: statusPayload("transcript.done", "bot-1"),
    });
    const { status } = await parseJsonResponse(await POST(req));

    expect(status).toBe(200);
    expect(mockGenerateSummary).toHaveBeenCalledWith(
      segments,
      expect.objectContaining({ title: "Test Meeting" })
    );
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "completed",
        metadata: expect.objectContaining({ summary: "Summary text" }),
      })
    );
  });

  it("completes without summary when generation fails", async () => {
    mockScrollTranscript.mockRejectedValueOnce(new Error("Qdrant down"));
    mockDb.where
      .mockResolvedValueOnce([
        fakeMeeting({ status: "processing", metadata: { botId: "bot-1" } }),
      ])
      .mockResolvedValueOnce(undefined);

    const req = createJsonRequest(URL, {
      method: "POST",
      body: statusPayload("transcript.done", "bot-1"),
    });
    const { status } = await parseJsonResponse(await POST(req));

    expect(status).toBe(200);
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "completed" })
    );
  });

  it("preserves endedAt on bot.call_ended", async () => {
    const existingEndedAt = new Date("2026-03-20T10:00:00Z");
    mockDb.where
      .mockResolvedValueOnce([
        fakeMeeting({
          status: "active",
          endedAt: existingEndedAt,
        }),
      ])
      .mockResolvedValueOnce(undefined);

    const req = createJsonRequest(URL, {
      method: "POST",
      body: statusPayload("bot.call_ended", "bot-1"),
    });
    await POST(req);

    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ endedAt: existingEndedAt })
    );
  });
});
