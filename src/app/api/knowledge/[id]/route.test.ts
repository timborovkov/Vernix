const {
  mockDb,
  mockDeleteFile,
  mockGetDownloadUrl,
  mockDeleteDocumentChunks,
  mockKnowledgeCollectionName,
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
    mockDeleteFile: vi.fn().mockResolvedValue(undefined),
    mockGetDownloadUrl: vi
      .fn()
      .mockResolvedValue("https://s3.example.com/presigned"),
    mockDeleteDocumentChunks: vi.fn().mockResolvedValue(undefined),
    mockKnowledgeCollectionName: vi.fn().mockReturnValue("knowledge_testuser"),
  };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/storage/operations", () => ({
  deleteFile: mockDeleteFile,
  getDownloadUrl: mockGetDownloadUrl,
}));
vi.mock("@/lib/vector/knowledge", () => ({
  deleteDocumentChunks: mockDeleteDocumentChunks,
  knowledgeCollectionName: mockKnowledgeCollectionName,
}));

import { GET, DELETE } from "./route";
import { parseJsonResponse, fakeDocument } from "@/test/helpers";

const DOC_ID = "c2aadd11-2b3c-4ef8-bb6d-8dd1df602c33";
const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe("GET /api/knowledge/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns document with download URL", async () => {
    const doc = fakeDocument();
    mockDb.where.mockResolvedValueOnce([doc]);

    const req = new Request(`http://localhost/api/knowledge/${DOC_ID}`);
    const { status, data } = await parseJsonResponse(
      await GET(req, makeParams(DOC_ID))
    );

    expect(status).toBe(200);
    expect(data.fileName).toBe("test-doc.pdf");
    expect(data.downloadUrl).toBe("https://s3.example.com/presigned");
  });

  it("returns 404 for non-existent document", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    const req = new Request(`http://localhost/api/knowledge/${DOC_ID}`);
    const { status } = await parseJsonResponse(
      await GET(req, makeParams(DOC_ID))
    );

    expect(status).toBe(404);
  });
});

describe("DELETE /api/knowledge/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes document, chunks, and S3 file", async () => {
    const doc = fakeDocument();
    mockDb.where
      .mockResolvedValueOnce([doc]) // SELECT
      .mockResolvedValueOnce([]); // DELETE

    const req = new Request(`http://localhost/api/knowledge/${DOC_ID}`, {
      method: "DELETE",
    });
    const { status, data } = await parseJsonResponse(
      await DELETE(req, makeParams(DOC_ID))
    );

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDeleteDocumentChunks).toHaveBeenCalledWith(
      "knowledge_testuser",
      DOC_ID
    );
    expect(mockDeleteFile).toHaveBeenCalledWith(doc.s3Key);
  });

  it("returns 404 for non-existent document", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    const req = new Request(`http://localhost/api/knowledge/${DOC_ID}`, {
      method: "DELETE",
    });
    const { status } = await parseJsonResponse(
      await DELETE(req, makeParams(DOC_ID))
    );

    expect(status).toBe(404);
  });

  it("uses meeting qdrant collection for meeting-scoped documents", async () => {
    const doc = fakeDocument({ meetingId: "meeting-123" });
    mockDb.where
      .mockResolvedValueOnce([doc]) // SELECT document
      .mockResolvedValueOnce([{ qdrantCollectionName: "meeting_coll_xyz" }]) // SELECT meeting
      .mockResolvedValueOnce([]); // DELETE

    const req = new Request(`http://localhost/api/knowledge/${DOC_ID}`, {
      method: "DELETE",
    });
    const { status } = await parseJsonResponse(
      await DELETE(req, makeParams(DOC_ID))
    );

    expect(status).toBe(200);
    // Should use the meeting's collection, not the knowledge collection
    expect(mockDeleteDocumentChunks).toHaveBeenCalledWith(
      "meeting_coll_xyz",
      DOC_ID
    );
    expect(mockKnowledgeCollectionName).not.toHaveBeenCalled();
  });
});
