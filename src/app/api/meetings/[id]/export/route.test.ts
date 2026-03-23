const { mockDb, mockScrollTranscript, mockFormatMarkdown, mockGeneratePdf } =
  vi.hoisted(() => {
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
      mockFormatMarkdown: vi.fn().mockReturnValue("# Test\n"),
      mockGeneratePdf: vi.fn().mockResolvedValue(Buffer.from("%PDF-1.4 fake")),
    };
  });

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/vector/scroll", () => ({
  scrollTranscript: mockScrollTranscript,
}));
vi.mock("@/lib/export/markdown", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/export/markdown")>();
  return {
    ...actual,
    formatMeetingMarkdown: mockFormatMarkdown,
  };
});
vi.mock("@/lib/export/pdf", () => ({
  generateMeetingPdf: mockGeneratePdf,
}));

import { GET } from "./route";
import { fakeMeeting } from "@/test/helpers";

const validUuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

function makeRequest(id: string, format?: string) {
  const qs = format ? `?format=${format}` : "";
  return new Request(`http://localhost/api/meetings/${id}/export${qs}`);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/meetings/[id]/export", () => {
  beforeEach(() => {
    mockDb.where.mockReset();
    mockDb.orderBy.mockReset();
    mockScrollTranscript.mockReset().mockResolvedValue([]);
    mockFormatMarkdown.mockClear().mockReturnValue("# Test\n");
    mockGeneratePdf.mockClear().mockResolvedValue(Buffer.from("%PDF-1.4 fake"));

    // First where → meeting lookup, second where (via orderBy) → tasks
    mockDb.where.mockImplementation(() => mockDb);
    mockDb.orderBy.mockResolvedValue([]);
  });

  it("returns 400 when format is missing", async () => {
    const res = await GET(makeRequest(validUuid), makeParams(validUuid));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/format/i);
  });

  it("returns 400 when format is invalid", async () => {
    const res = await GET(
      makeRequest(validUuid, "docx"),
      makeParams(validUuid)
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when meeting not found", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    const res = await GET(makeRequest(validUuid, "md"), makeParams(validUuid));
    expect(res.status).toBe(404);
  });

  it("returns markdown with correct headers", async () => {
    const meeting = fakeMeeting({ title: "Sprint Review" });
    mockDb.where.mockResolvedValueOnce([meeting]);
    mockDb.orderBy.mockResolvedValueOnce([]);

    const res = await GET(makeRequest(validUuid, "md"), makeParams(validUuid));

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe(
      "text/markdown; charset=utf-8"
    );
    expect(res.headers.get("content-disposition")).toContain(
      "sprint-review.md"
    );
    const text = await res.text();
    expect(text).toBe("# Test\n");
    expect(mockFormatMarkdown).toHaveBeenCalled();
  });

  it("returns PDF with correct headers", async () => {
    const meeting = fakeMeeting({ title: "Sprint Review" });
    mockDb.where.mockResolvedValueOnce([meeting]);
    mockDb.orderBy.mockResolvedValueOnce([]);

    const res = await GET(makeRequest(validUuid, "pdf"), makeParams(validUuid));

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toContain(
      "sprint-review.pdf"
    );
    expect(mockGeneratePdf).toHaveBeenCalled();
  });

  it("exports without transcript when scroll fails", async () => {
    const meeting = fakeMeeting();
    mockDb.where.mockResolvedValueOnce([meeting]);
    mockDb.orderBy.mockResolvedValueOnce([]);
    mockScrollTranscript.mockRejectedValueOnce(new Error("Qdrant down"));

    const res = await GET(makeRequest(validUuid, "md"), makeParams(validUuid));

    expect(res.status).toBe(200);
    expect(mockFormatMarkdown).toHaveBeenCalledWith(
      expect.objectContaining({ transcript: [] })
    );
  });
});
