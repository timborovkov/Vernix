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
    mockGenerateSummary: vi.fn().mockResolvedValue("Test summary"),
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
import { parseJsonResponse, fakeMeeting } from "@/test/helpers";

const validUuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

function makeRequest() {
  return new Request(`http://localhost/api/meetings/${validUuid}/summarize`, {
    method: "POST",
  });
}

function makeParams() {
  return { params: Promise.resolve({ id: validUuid }) };
}

describe("POST /api/meetings/[id]/summarize", () => {
  beforeEach(() => {
    mockDb.where.mockReset();
    mockDb.returning.mockReset();
    mockScrollTranscript.mockReset().mockResolvedValue([]);
    mockGenerateSummary.mockReset().mockResolvedValue("Test summary");
  });

  it("returns 404 for unknown meeting", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    const { status } = await parseJsonResponse(
      await POST(makeRequest(), makeParams())
    );
    expect(status).toBe(404);
  });

  it("returns 400 for active meeting", async () => {
    mockDb.where.mockResolvedValueOnce([fakeMeeting({ status: "active" })]);

    const { status, data } = await parseJsonResponse(
      await POST(makeRequest(), makeParams())
    );
    expect(status).toBe(400);
    expect(data.error).toMatch(/Cannot summarize/);
  });

  it("generates summary for completed meeting", async () => {
    const segments = [{ text: "Hello", speaker: "Alice", timestampMs: 1000 }];
    mockScrollTranscript.mockResolvedValueOnce(segments);
    mockGenerateSummary.mockResolvedValueOnce("New summary");
    // First where: select meeting. Second where: update().set().where().returning()
    mockDb.where
      .mockResolvedValueOnce([
        fakeMeeting({ status: "completed", metadata: { botId: "bot-1" } }),
      ])
      .mockImplementationOnce(() => ({
        returning: vi.fn().mockResolvedValueOnce([
          fakeMeeting({
            status: "completed",
            metadata: { botId: "bot-1", summary: "New summary" },
          }),
        ]),
      }));

    const { status, data } = await parseJsonResponse(
      await POST(makeRequest(), makeParams())
    );
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockGenerateSummary).toHaveBeenCalledWith(
      segments,
      expect.objectContaining({ title: "Test Meeting" })
    );
  });

  it("generates summary for processing meeting", async () => {
    mockDb.where
      .mockResolvedValueOnce([fakeMeeting({ status: "processing" })])
      .mockImplementationOnce(() => ({
        returning: vi
          .fn()
          .mockResolvedValueOnce([fakeMeeting({ status: "completed" })]),
      }));

    const { status } = await parseJsonResponse(
      await POST(makeRequest(), makeParams())
    );
    expect(status).toBe(200);
  });
});
