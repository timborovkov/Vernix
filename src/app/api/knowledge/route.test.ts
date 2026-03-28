const { mockDb, mockEnsureBucket, mockUploadFile, mockProcessDocument } =
  vi.hoisted(() => {
    const db: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const m of [
      "select",
      "from",
      "leftJoin",
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

  it("returns user documents with meetingTitle", async () => {
    const docs = [
      { ...fakeDocument(), meetingTitle: null },
      {
        ...fakeDocument({
          id: "d2",
          fileName: "other.txt",
          meetingId: "meeting-1",
        }),
        meetingTitle: "Sprint Retro",
      },
    ];
    mockDb.orderBy.mockResolvedValueOnce(docs);

    const req = new Request("http://localhost/api/knowledge");
    const { status, data } = await parseJsonResponse(await GET(req));

    expect(status).toBe(200);
    expect(data.documents).toHaveLength(2);
    expect(data.documents[0].meetingTitle).toBeNull();
    expect(data.documents[1].meetingTitle).toBe("Sprint Retro");
  });

  it("filters by meetingId when provided", async () => {
    const docs = [
      {
        ...fakeDocument({ meetingId: "meeting-1" }),
        meetingTitle: "Sprint Retro",
      },
    ];
    mockDb.orderBy.mockResolvedValueOnce(docs);

    const req = new Request(
      "http://localhost/api/knowledge?meetingId=meeting-1"
    );
    const { status, data } = await parseJsonResponse(await GET(req));

    expect(status).toBe(200);
    expect(data.documents).toHaveLength(1);
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
    const doc = fakeDocument({ status: "ready", fileName: "test.pdf" });
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
    expect(data.fileName).toBe("test.pdf");
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

  it("rejects upload with non-existent meetingId", async () => {
    mockDb.where.mockResolvedValueOnce([]); // meeting not found

    const formData = new FormData();
    formData.append(
      "file",
      new File(["data"], "test.pdf", { type: "application/pdf" })
    );
    formData.append("meetingId", "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11");

    const req = new Request("http://localhost/api/knowledge", {
      method: "POST",
      body: formData,
    });

    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(404);
    expect(data.error).toMatch(/meeting not found/i);
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

  it("returns 403 when document count limit is reached", async () => {
    const { canUploadDocument } = await import("@/lib/billing/limits");
    vi.mocked(canUploadDocument).mockReturnValueOnce({
      allowed: false,
      reason: "Maximum 5 documents",
    });

    const formData = new FormData();
    formData.append(
      "file",
      new File(["test"], "doc.txt", { type: "text/plain" })
    );

    const req = new Request("http://localhost/api/knowledge", {
      method: "POST",
      body: formData,
    });

    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(403);
    expect(data.error).toBe("Maximum 5 documents");
    expect(data.code).toBe("LIMIT_EXCEEDED");
    expect(mockUploadFile).not.toHaveBeenCalled();
  });

  it("returns 403 when storage limit is exceeded", async () => {
    const { canUploadDocument } = await import("@/lib/billing/limits");
    vi.mocked(canUploadDocument).mockReturnValueOnce({
      allowed: false,
      reason: "Storage limit reached",
    });

    const formData = new FormData();
    formData.append(
      "file",
      new File(["test"], "doc.txt", { type: "text/plain" })
    );

    const req = new Request("http://localhost/api/knowledge", {
      method: "POST",
      body: formData,
    });

    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(403);
    expect(data.error).toBe("Storage limit reached");
    expect(mockEnsureBucket).not.toHaveBeenCalled();
  });
});
