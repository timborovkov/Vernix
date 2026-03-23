const { mockDb, mockScrollTranscript, mockGenerateZip } = vi.hoisted(() => {
  const db: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of [
    "select",
    "from",
    "where",
    "orderBy",
    "limit",
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
    mockGenerateZip: vi.fn().mockResolvedValue(Buffer.from("PK\x03\x04fake")),
  };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/vector/scroll", () => ({
  scrollTranscript: mockScrollTranscript,
}));
vi.mock("@/lib/export/zip", () => ({
  generateMeetingsZip: mockGenerateZip,
}));

import { GET } from "./route";
import { fakeMeeting } from "@/test/helpers";

describe("GET /api/export", () => {
  beforeEach(() => {
    mockDb.limit.mockReset();
    mockDb.where.mockReset();
    mockDb.orderBy.mockReset();
    mockScrollTranscript.mockReset().mockResolvedValue([]);
    mockGenerateZip
      .mockClear()
      .mockResolvedValue(Buffer.from("PK\x03\x04fake"));

    mockDb.where.mockImplementation(() => mockDb);
    mockDb.orderBy.mockImplementation(() => mockDb);
    mockDb.limit.mockResolvedValue([]);
  });

  it("returns ZIP with correct headers", async () => {
    const meeting = fakeMeeting();
    // meetings query: where → orderBy → limit (orderBy returns mockDb so limit is chained)
    // tasks query: where → orderBy (terminal, resolves to [])
    mockDb.limit.mockResolvedValueOnce([meeting]);
    mockDb.orderBy
      .mockReturnValueOnce(mockDb) // meetings query — chain to limit
      .mockResolvedValueOnce([]); // tasks query — terminal

    const res = await GET();

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/zip");
    expect(res.headers.get("content-disposition")).toContain(
      "kivikova-export-"
    );
    expect(res.headers.get("content-disposition")).toContain(".zip");
    expect(mockGenerateZip).toHaveBeenCalledWith([
      expect.objectContaining({ meeting }),
    ]);
  });

  it("returns ZIP for empty meetings list", async () => {
    mockDb.limit.mockResolvedValueOnce([]);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(mockGenerateZip).toHaveBeenCalledWith([]);
  });

  it("continues export when transcript fetch fails", async () => {
    const meeting = fakeMeeting();
    mockDb.limit.mockResolvedValueOnce([meeting]);
    mockDb.orderBy
      .mockReturnValueOnce(mockDb) // meetings query — chain to limit
      .mockResolvedValueOnce([]); // tasks query — terminal
    mockScrollTranscript.mockRejectedValueOnce(new Error("Qdrant down"));

    const res = await GET();

    expect(res.status).toBe(200);
    expect(mockGenerateZip).toHaveBeenCalledWith([
      expect.objectContaining({ transcript: [] }),
    ]);
  });
});
