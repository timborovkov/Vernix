const { mockDb, mockScrollTranscript } = vi.hoisted(() => {
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
  };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/vector/scroll", () => ({
  scrollTranscript: mockScrollTranscript,
}));

import { GET } from "./route";
import { parseJsonResponse, fakeMeeting } from "@/test/helpers";

const validUuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

function makeRequest(id: string) {
  return new Request(`http://localhost/api/meetings/${id}/transcript`);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/meetings/[id]/transcript", () => {
  beforeEach(() => {
    mockDb.where.mockReset();
    mockScrollTranscript.mockReset().mockResolvedValue([]);
  });

  it("returns 404 for unknown meeting", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    const response = await GET(makeRequest(validUuid), makeParams(validUuid));
    const { status, data } = await parseJsonResponse(response);

    expect(status).toBe(404);
    expect(data.error).toMatch(/not found/i);
  });

  it("returns transcript segments for valid meeting", async () => {
    const meeting = fakeMeeting({
      qdrantCollectionName: "coll_abc",
    });
    mockDb.where.mockResolvedValueOnce([meeting]);
    mockScrollTranscript.mockResolvedValueOnce([
      { text: "Hello", speaker: "Alice", timestampMs: 1000 },
      { text: "World", speaker: "Bob", timestampMs: 2000 },
    ]);

    const response = await GET(makeRequest(validUuid), makeParams(validUuid));
    const { status, data } = await parseJsonResponse(response);

    expect(status).toBe(200);
    expect(data.segments).toHaveLength(2);
    expect(data.segments[0].text).toBe("Hello");
    expect(mockScrollTranscript).toHaveBeenCalledWith("coll_abc");
  });

  it("returns empty segments array when no transcript data", async () => {
    mockDb.where.mockResolvedValueOnce([fakeMeeting()]);

    const response = await GET(makeRequest(validUuid), makeParams(validUuid));
    const { status, data } = await parseJsonResponse(response);

    expect(status).toBe(200);
    expect(data.segments).toEqual([]);
  });

  it("returns 500 when scroll fails", async () => {
    mockDb.where.mockResolvedValueOnce([fakeMeeting()]);
    mockScrollTranscript.mockRejectedValueOnce(new Error("Qdrant down"));

    const response = await GET(makeRequest(validUuid), makeParams(validUuid));
    const { status, data } = await parseJsonResponse(response);

    expect(status).toBe(500);
    expect(data.error).toMatch(/failed/i);
  });
});
