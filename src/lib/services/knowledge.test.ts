import { describe, it, expect, vi, beforeEach } from "vitest";
import { fakeMeeting, fakeDocument } from "@/test/helpers";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const {
  mockDb,
  mockEnsureBucket,
  mockUploadFile,
  mockDeleteFile,
  mockGetDownloadUrl,
  mockProcessDocument,
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
    "leftJoin",
    "limit",
    "getTableColumns",
  ]) {
    db[m] = vi.fn().mockImplementation(() => db);
  }
  return {
    mockDb: db,
    mockEnsureBucket: vi.fn().mockResolvedValue(undefined),
    mockUploadFile: vi.fn().mockResolvedValue(undefined),
    mockDeleteFile: vi.fn().mockResolvedValue(undefined),
    mockGetDownloadUrl: vi
      .fn()
      .mockResolvedValue("https://s3.example.com/file"),
    mockProcessDocument: vi.fn().mockResolvedValue(undefined),
    mockDeleteDocumentChunks: vi.fn().mockResolvedValue(undefined),
    mockKnowledgeCollectionName: vi.fn().mockReturnValue("knowledge_user123"),
  };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/storage/operations", () => ({
  ensureBucket: mockEnsureBucket,
  uploadFile: mockUploadFile,
  deleteFile: mockDeleteFile,
  getDownloadUrl: mockGetDownloadUrl,
}));
vi.mock("@/lib/knowledge/process", () => ({
  processDocument: mockProcessDocument,
}));
vi.mock("@/lib/vector/knowledge", () => ({
  deleteDocumentChunks: mockDeleteDocumentChunks,
  knowledgeCollectionName: mockKnowledgeCollectionName,
}));

import { canUploadDocument } from "@/lib/billing/limits";

const USER_ID = "b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22";

function resetDbChain() {
  for (const m of Object.keys(mockDb)) {
    mockDb[m].mockReset().mockImplementation(() => mockDb);
  }
  mockEnsureBucket.mockReset().mockResolvedValue(undefined);
  mockUploadFile.mockReset().mockResolvedValue(undefined);
  mockDeleteFile.mockReset().mockResolvedValue(undefined);
  mockGetDownloadUrl
    .mockReset()
    .mockResolvedValue("https://s3.example.com/file");
  mockProcessDocument.mockReset().mockResolvedValue(undefined);
  mockDeleteDocumentChunks.mockReset().mockResolvedValue(undefined);
  mockKnowledgeCollectionName.mockReset().mockReturnValue("knowledge_user123");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

import { uploadDocument, deleteDocument, getDocument } from "./knowledge";

function createMockFile(name: string, size: number, type: string): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

describe("uploadDocument", () => {
  beforeEach(resetDbChain);

  it("throws ValidationError when file is empty", async () => {
    const file = createMockFile("test.pdf", 0, "application/pdf");

    await expect(uploadDocument(USER_ID, file)).rejects.toThrow(
      "File is empty"
    );
  });

  it("throws ValidationError for unsupported file type", async () => {
    const file = createMockFile("test.exe", 100, "application/x-executable");

    await expect(uploadDocument(USER_ID, file)).rejects.toThrow(
      "Unsupported file type"
    );
  });

  it("throws BillingError when upload limit exceeded", async () => {
    vi.mocked(canUploadDocument).mockReturnValueOnce({
      allowed: false,
      reason: "Document storage limit reached",
    });

    const file = createMockFile("test.pdf", 100, "application/pdf");

    await expect(uploadDocument(USER_ID, file)).rejects.toThrow(
      "Document storage limit reached"
    );
  });

  it("throws NotFoundError for meeting-scoped upload when meeting not found", async () => {
    const file = createMockFile("test.pdf", 100, "application/pdf");
    // Meeting ownership check returns empty
    mockDb.where.mockResolvedValueOnce([]);

    await expect(
      uploadDocument(USER_ID, file, "nonexistent-meeting")
    ).rejects.toThrow("Meeting not found");
  });

  it("uploads file to S3 with correct key pattern", async () => {
    const file = createMockFile("report.pdf", 1024, "application/pdf");
    const doc = fakeDocument();
    mockDb.returning.mockResolvedValueOnce([doc]); // insert
    mockDb.where.mockResolvedValueOnce([doc]); // re-fetch

    await uploadDocument(USER_ID, file);

    expect(mockEnsureBucket).toHaveBeenCalled();
    expect(mockUploadFile).toHaveBeenCalledWith(
      expect.stringMatching(
        /^knowledge\/b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22\/[a-f0-9-]+\/report\.pdf$/
      ),
      expect.any(Buffer),
      "application/pdf"
    );
  });

  it("inserts document with processing status", async () => {
    const file = createMockFile("doc.txt", 512, "text/plain");
    const doc = fakeDocument({ status: "processing" });
    mockDb.returning.mockResolvedValueOnce([doc]); // insert
    mockDb.where.mockResolvedValueOnce([doc]); // re-fetch

    await uploadDocument(USER_ID, file);

    expect(mockDb.values).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        fileType: "txt",
        fileSize: 512,
        status: "processing",
      })
    );
  });

  it("verifies meeting ownership for scoped uploads", async () => {
    const file = createMockFile("doc.pdf", 1024, "application/pdf");
    const meeting = fakeMeeting();
    const doc = fakeDocument({ meetingId: meeting.id });

    // Meeting ownership check
    mockDb.where.mockResolvedValueOnce([{ id: meeting.id }]);
    // insert().returning()
    mockDb.returning.mockResolvedValueOnce([doc]);
    // re-fetch
    mockDb.where.mockResolvedValueOnce([doc]);

    await uploadDocument(USER_ID, file, meeting.id);

    expect(mockProcessDocument).toHaveBeenCalledWith(
      expect.any(String), // documentId
      USER_ID,
      meeting.id
    );
  });

  it("sanitizes filename with path traversal attempts", async () => {
    const file = createMockFile("../../../etc/passwd", 100, "text/plain");
    const doc = fakeDocument();
    mockDb.returning.mockResolvedValueOnce([doc]);
    mockDb.where.mockResolvedValueOnce([doc]);

    await uploadDocument(USER_ID, file);

    // S3 key should contain sanitized filename (.. replaced with _)
    expect(mockUploadFile).toHaveBeenCalledWith(
      expect.stringContaining("______etc_passwd"),
      expect.any(Buffer),
      "text/plain"
    );
  });

  it("does not throw when processDocument fails (sets status in DB)", async () => {
    const file = createMockFile("doc.pdf", 1024, "application/pdf");
    const doc = fakeDocument({ status: "processing" });
    mockDb.returning.mockResolvedValueOnce([doc]); // insert
    const failedDoc = fakeDocument({ status: "failed" });
    mockDb.where.mockResolvedValueOnce([failedDoc]); // re-fetch
    mockProcessDocument.mockRejectedValueOnce(new Error("Parse failed"));

    const result = await uploadDocument(USER_ID, file);

    expect(result.status).toBe("failed");
  });
});

describe("getDocument", () => {
  beforeEach(resetDbChain);

  it("throws NotFoundError when document does not exist", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    await expect(getDocument(USER_ID, "nonexistent")).rejects.toThrow(
      "Document not found"
    );
  });

  it("returns document with download URL", async () => {
    const doc = fakeDocument();
    mockDb.where.mockResolvedValueOnce([doc]);
    mockGetDownloadUrl.mockResolvedValueOnce("https://s3.example.com/signed");

    const result = await getDocument(USER_ID, doc.id);

    expect(result.downloadUrl).toBe("https://s3.example.com/signed");
    expect(result.id).toBe(doc.id);
    expect(mockGetDownloadUrl).toHaveBeenCalledWith(doc.s3Key);
  });
});

describe("deleteDocument", () => {
  beforeEach(resetDbChain);

  it("throws NotFoundError when document does not exist", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    await expect(deleteDocument(USER_ID, "nonexistent")).rejects.toThrow(
      "Document not found"
    );
  });

  it("deletes Qdrant chunks from knowledge collection for non-meeting docs", async () => {
    const doc = fakeDocument({ meetingId: null });
    mockDb.where
      .mockResolvedValueOnce([doc]) // find doc
      .mockResolvedValue(undefined); // final delete

    await deleteDocument(USER_ID, doc.id);

    expect(mockKnowledgeCollectionName).toHaveBeenCalledWith(USER_ID);
    expect(mockDeleteDocumentChunks).toHaveBeenCalledWith(
      "knowledge_user123",
      doc.id
    );
  });

  it("deletes Qdrant chunks from meeting collection for meeting-scoped docs", async () => {
    const doc = fakeDocument({ meetingId: "meeting-abc" });
    mockDb.where
      .mockResolvedValueOnce([doc]) // find doc
      .mockResolvedValueOnce([{ qdrantCollectionName: "meeting_abc123" }]) // meeting lookup
      .mockResolvedValue(undefined); // final delete

    await deleteDocument(USER_ID, doc.id);

    expect(mockDeleteDocumentChunks).toHaveBeenCalledWith(
      "meeting_abc123",
      doc.id
    );
  });

  it("deletes S3 file", async () => {
    const doc = fakeDocument({ s3Key: "knowledge/user/doc/file.pdf" });
    mockDb.where
      .mockResolvedValueOnce([doc]) // find doc
      .mockResolvedValue(undefined); // final delete

    await deleteDocument(USER_ID, doc.id);

    expect(mockDeleteFile).toHaveBeenCalledWith("knowledge/user/doc/file.pdf");
  });

  it("deletes DB record", async () => {
    const doc = fakeDocument();
    mockDb.where
      .mockResolvedValueOnce([doc]) // find doc
      .mockResolvedValue(undefined); // subsequent calls

    await deleteDocument(USER_ID, doc.id);

    expect(mockDb.delete).toHaveBeenCalled();
  });

  it("continues cleanup even if Qdrant delete fails", async () => {
    const doc = fakeDocument({ meetingId: null });
    mockDb.where
      .mockResolvedValueOnce([doc]) // find doc
      .mockResolvedValue(undefined); // subsequent
    mockDeleteDocumentChunks.mockRejectedValueOnce(
      new Error("Qdrant connection failed")
    );

    await deleteDocument(USER_ID, doc.id);

    expect(mockDeleteFile).toHaveBeenCalledWith(doc.s3Key);
    expect(mockDb.delete).toHaveBeenCalled();
  });

  it("continues cleanup even if S3 delete fails", async () => {
    const doc = fakeDocument({ meetingId: null });
    mockDb.where
      .mockResolvedValueOnce([doc]) // find doc
      .mockResolvedValue(undefined); // subsequent
    mockDeleteFile.mockRejectedValueOnce(new Error("S3 error"));

    await deleteDocument(USER_ID, doc.id);

    expect(mockDb.delete).toHaveBeenCalled();
  });
});
