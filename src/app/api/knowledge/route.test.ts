const { mockListDocuments, mockUploadDocument } = vi.hoisted(() => ({
  mockListDocuments: vi.fn(),
  mockUploadDocument: vi.fn(),
}));

vi.mock("@/lib/services/knowledge", () => ({
  listDocuments: mockListDocuments,
  uploadDocument: mockUploadDocument,
}));

import { GET, POST } from "./route";
import { parseJsonResponse, fakeDocument } from "@/test/helpers";

describe("GET /api/knowledge", () => {
  beforeEach(() => vi.clearAllMocks());

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
    mockListDocuments.mockResolvedValueOnce({
      data: docs,
      meta: { hasMore: false },
    });

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
    mockListDocuments.mockResolvedValueOnce({
      data: docs,
      meta: { hasMore: false },
    });

    const req = new Request(
      "http://localhost/api/knowledge?meetingId=meeting-1"
    );
    const { status, data } = await parseJsonResponse(await GET(req));

    expect(status).toBe(200);
    expect(data.documents).toHaveLength(1);
    expect(mockListDocuments).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ meetingId: "meeting-1" })
    );
  });
});

describe("POST /api/knowledge", () => {
  beforeEach(() => vi.clearAllMocks());

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

  it("uploads and processes valid PDF", async () => {
    const doc = fakeDocument({ status: "ready", fileName: "test.pdf" });
    mockUploadDocument.mockResolvedValueOnce(doc);

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
    expect(mockUploadDocument).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(File),
      undefined
    );
  });

  it("returns 403 when billing limit is reached", async () => {
    const { BillingError } = await import("@/lib/api/errors");
    mockUploadDocument.mockRejectedValueOnce(
      new BillingError("Maximum 5 documents", 403)
    );

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
  });

  it("rejects upload with non-existent meetingId", async () => {
    const { NotFoundError } = await import("@/lib/api/errors");
    mockUploadDocument.mockRejectedValueOnce(new NotFoundError("Meeting"));

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
    expect(data.error).toMatch(/not found/i);
  });

  it("rejects empty files", async () => {
    const { ValidationError } = await import("@/lib/api/errors");
    mockUploadDocument.mockRejectedValueOnce(
      new ValidationError("File is empty")
    );

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
});
