const {
  mockDb,
  mockGetDownloadUrl,
  mockParseDocument,
  mockChunkText,
  mockEnsureKnowledgeCollection,
  mockUpsertDocumentChunks,
} = vi.hoisted(() => {
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
    mockGetDownloadUrl: vi
      .fn()
      .mockResolvedValue("https://s3.example.com/file.pdf"),
    mockParseDocument: vi.fn().mockResolvedValue("Parsed document text."),
    mockChunkText: vi.fn().mockReturnValue([
      { text: "chunk one", index: 0 },
      { text: "chunk two", index: 1 },
    ]),
    mockEnsureKnowledgeCollection: vi
      .fn()
      .mockResolvedValue("knowledge_testuser"),
    mockUpsertDocumentChunks: vi.fn().mockResolvedValue(["id-1", "id-2"]),
  };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/storage/operations", () => ({
  getDownloadUrl: mockGetDownloadUrl,
}));
vi.mock("./parse", () => ({
  parseDocument: mockParseDocument,
}));
vi.mock("./chunk", () => ({
  chunkText: mockChunkText,
}));
vi.mock("@/lib/vector/knowledge", () => ({
  ensureKnowledgeCollection: mockEnsureKnowledgeCollection,
  upsertDocumentChunks: mockUpsertDocumentChunks,
}));

// Mock global fetch for S3 download
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
});
vi.stubGlobal("fetch", mockFetch);

import { processDocument } from "./process";
import { fakeDocument } from "@/test/helpers";

const DOC_ID = "c2aadd11-2b3c-4ef8-bb6d-8dd1df602c33";
const USER_ID = "b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22";

describe("processDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    });
  });

  it("processes a document end-to-end", async () => {
    const doc = fakeDocument();
    mockDb.where.mockResolvedValueOnce([doc]); // select doc

    await processDocument(DOC_ID, USER_ID);

    // Downloaded from S3
    expect(mockGetDownloadUrl).toHaveBeenCalledWith(doc.s3Key);
    expect(mockFetch).toHaveBeenCalled();

    // Parsed
    expect(mockParseDocument).toHaveBeenCalled();

    // Chunked
    expect(mockChunkText).toHaveBeenCalledWith("Parsed document text.");

    // Knowledge collection ensured
    expect(mockEnsureKnowledgeCollection).toHaveBeenCalledWith(USER_ID);

    // Chunks upserted
    expect(mockUpsertDocumentChunks).toHaveBeenCalledWith(
      "knowledge_testuser",
      [
        {
          text: "chunk one",
          documentId: DOC_ID,
          fileName: doc.fileName,
          chunkIndex: 0,
        },
        {
          text: "chunk two",
          documentId: DOC_ID,
          fileName: doc.fileName,
          chunkIndex: 1,
        },
      ]
    );

    // Status updated to ready
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "ready", chunkCount: 2 })
    );
  });

  it("throws and sets status to failed for empty text", async () => {
    const doc = fakeDocument();
    mockDb.where.mockResolvedValueOnce([doc]);
    mockParseDocument.mockResolvedValueOnce("   ");

    await expect(processDocument(DOC_ID, USER_ID)).rejects.toThrow(
      "no extractable text"
    );

    expect(mockChunkText).not.toHaveBeenCalled();
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed" })
    );
  });

  it("throws and sets status to failed when document not found", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    await expect(processDocument(DOC_ID, USER_ID)).rejects.toThrow(
      "Document not found"
    );

    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed" })
    );
  });

  it("throws and sets status to failed when S3 download fails", async () => {
    const doc = fakeDocument();
    mockDb.where.mockResolvedValueOnce([doc]);
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });

    await expect(processDocument(DOC_ID, USER_ID)).rejects.toThrow(
      "Failed to download file"
    );

    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed" })
    );
  });

  it("throws when chunk count exceeds max", async () => {
    const doc = fakeDocument();
    mockDb.where.mockResolvedValueOnce([doc]);

    const tooManyChunks = Array.from({ length: 501 }, (_, i) => ({
      text: `chunk ${i}`,
      index: i,
    }));
    mockChunkText.mockReturnValueOnce(tooManyChunks);

    await expect(processDocument(DOC_ID, USER_ID)).rejects.toThrow(
      "501 chunks (max 500)"
    );

    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed" })
    );
  });

  it("throws and sets failed for invalid file type", async () => {
    const doc = fakeDocument({ fileType: "exe" });
    mockDb.where.mockResolvedValueOnce([doc]);

    await expect(processDocument(DOC_ID, USER_ID)).rejects.toThrow(
      "Invalid file type"
    );

    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed" })
    );
  });
});
