import {
  createJsonRequest,
  parseJsonResponse,
  fakeMeeting,
} from "@/test/helpers";

const { mockDb, mockCreateMeetingCollection } = vi.hoisted(() => {
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
    mockCreateMeetingCollection: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/vector/collections", () => ({
  createMeetingCollection: mockCreateMeetingCollection,
}));
vi.mock("@/lib/vector/agenda", () => ({
  upsertAgenda: vi.fn().mockResolvedValue(undefined),
}));

import { GET, POST } from "./route";

describe("GET /api/meetings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns meetings scoped to the authenticated user", async () => {
    mockDb.orderBy.mockResolvedValueOnce([fakeMeeting()]);

    const response = await GET();
    const { status, data } = await parseJsonResponse(response);

    expect(status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].title).toBe("Test Meeting");

    // Verify the where clause was called (userId scoping)
    expect(mockDb.where).toHaveBeenCalled();
  });

  it("returns empty array when no meetings", async () => {
    mockDb.orderBy.mockResolvedValueOnce([]);

    const response = await GET();
    const { status, data } = await parseJsonResponse(response);

    expect(status).toBe(200);
    expect(data).toEqual([]);
  });
});

describe("POST /api/meetings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 for missing title", async () => {
    const req = createJsonRequest("http://localhost/api/meetings", {
      method: "POST",
      body: { joinLink: "https://meet.google.com/abc" },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid URL", async () => {
    const req = createJsonRequest("http://localhost/api/meetings", {
      method: "POST",
      body: { title: "Test", joinLink: "not-a-url" },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("creates meeting with correct fields and Qdrant collection", async () => {
    mockDb.returning.mockResolvedValueOnce([fakeMeeting()]);

    const req = createJsonRequest("http://localhost/api/meetings", {
      method: "POST",
      body: { title: "Test", joinLink: "https://meet.google.com/abc" },
    });

    const response = await POST(req);
    const { status } = await parseJsonResponse(response);

    expect(status).toBe(201);

    // Verify Qdrant collection was created with correct naming pattern
    expect(mockCreateMeetingCollection).toHaveBeenCalledOnce();
    const collectionName = mockCreateMeetingCollection.mock.calls[0][0];
    expect(collectionName).toMatch(/^meeting_[a-f0-9]{32}$/);

    // Verify insert was called with correct user-scoped values
    expect(mockDb.values).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Test",
        joinLink: "https://meet.google.com/abc",
        userId: "b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22",
        qdrantCollectionName: collectionName,
      })
    );
  });

  it("stores agenda in metadata when provided", async () => {
    mockDb.returning.mockResolvedValueOnce([
      fakeMeeting({ metadata: { agenda: "Discuss Q4" } }),
    ]);

    const req = createJsonRequest("http://localhost/api/meetings", {
      method: "POST",
      body: {
        title: "Test",
        joinLink: "https://meet.google.com/abc",
        agenda: "Discuss Q4",
      },
    });

    const response = await POST(req);
    expect(response.status).toBe(201);

    expect(mockDb.values).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ agenda: "Discuss Q4" }),
      })
    );
  });

  it("sets silent flag in metadata when silent=true", async () => {
    mockDb.returning.mockResolvedValueOnce([
      fakeMeeting({ metadata: { silent: true } }),
    ]);

    const req = createJsonRequest("http://localhost/api/meetings", {
      method: "POST",
      body: {
        title: "Test",
        joinLink: "https://meet.google.com/abc",
        silent: true,
      },
    });

    const response = await POST(req);
    expect(response.status).toBe(201);

    expect(mockDb.values).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ silent: true }),
      })
    );
  });
});
