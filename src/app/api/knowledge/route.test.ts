const { mockDb, mockEnsureBucket, mockUploadFile, mockProcessDocument } =
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
      mockEnsureBucket: vi.fn().mockResolvedValue(undefined),
      mockUploadFile: vi.fn().mockResolvedValue(undefined),
      mockProcessDocument: vi.fn().mockResolvedValue(undefined),
    };
  });

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/storage/operations", () => ({
  ensureBucket: mockEnsureBucket,
  uploadFile: mockUploadFile,
}));
vi.mock("@/lib/knowledge/process", () => ({
  processDocument: mockProcessDocument,
}));

import { GET, POST } from "./route";
import { parseJsonResponse, fakeDocument } from "@/test/helpers";

describe("GET /api/knowledge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns user documents", async () => {
    const docs = [
      fakeDocument(),
      fakeDocument({ id: "d2", fileName: "other.txt" }),
    ];
    mockDb.orderBy.mockResolvedValueOnce(docs);

    const { status, data } = await parseJsonResponse(await GET());

    expect(status).toBe(200);
    expect(data.documents).toHaveLength(2);
  });
});

describe("POST /api/knowledge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects missing file", async () => {
    const formData = new FormData();
    const req = new Request("http://localhost/api/knowledge", {
      method: "POST",
      body: formData,
    });

    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
    expect(data.error).toMatch(/missing file/i);
  });

  it("rejects unsupported file types", async () => {
    const formData = new FormData();
    formData.append(
      "file",
      new File(["data"], "test.exe", { type: "application/x-msdownload" })
    );

    const req = new Request("http://localhost/api/knowledge", {
      method: "POST",
      body: formData,
    });

    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
    expect(data.error).toMatch(/unsupported/i);
  });

  it("uploads and processes valid PDF", async () => {
    const doc = fakeDocument({ status: "ready" });
    mockDb.returning.mockResolvedValueOnce([doc]);
    mockDb.where.mockResolvedValueOnce([doc]); // re-fetch after processing

    const formData = new FormData();
    formData.append(
      "file",
      new File(["fake-pdf-content"], "test.pdf", { type: "application/pdf" })
    );

    const req = new Request("http://localhost/api/knowledge", {
      method: "POST",
      body: formData,
    });

    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(201);
    expect(data.fileName).toBe("test-doc.pdf");
    expect(mockEnsureBucket).toHaveBeenCalled();
    expect(mockUploadFile).toHaveBeenCalled();
    expect(mockProcessDocument).toHaveBeenCalled();
  });

  it("rejects empty files", async () => {
    const formData = new FormData();
    formData.append(
      "file",
      new File([], "empty.pdf", { type: "application/pdf" })
    );

    const req = new Request("http://localhost/api/knowledge", {
      method: "POST",
      body: formData,
    });

    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
    expect(data.error).toMatch(/empty/i);
  });

  it("sanitizes path traversal in filenames", async () => {
    const doc = fakeDocument({ fileName: ".._.._secret.pdf" });
    mockDb.returning.mockResolvedValueOnce([doc]);
    mockDb.where.mockResolvedValueOnce([doc]);

    const formData = new FormData();
    formData.append(
      "file",
      new File(["data"], "../../secret.pdf", { type: "application/pdf" })
    );

    const req = new Request("http://localhost/api/knowledge", {
      method: "POST",
      body: formData,
    });

    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(201);
    // S3 key should not contain path traversal
    const uploadCall = mockUploadFile.mock.calls[0];
    expect(uploadCall[0]).not.toContain("..");
  });

  it("accepts text/plain files", async () => {
    const doc = fakeDocument({ fileType: "txt", fileName: "notes.txt" });
    mockDb.returning.mockResolvedValueOnce([doc]);
    mockDb.where.mockResolvedValueOnce([doc]);

    const formData = new FormData();
    formData.append(
      "file",
      new File(["some notes"], "notes.txt", { type: "text/plain" })
    );

    const req = new Request("http://localhost/api/knowledge", {
      method: "POST",
      body: formData,
    });

    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(201);
  });
});
