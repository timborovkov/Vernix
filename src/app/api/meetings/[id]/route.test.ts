import {
  createJsonRequest,
  parseJsonResponse,
  fakeMeeting,
} from "@/test/helpers";

const { mockDb, mockDeleteMeetingCollection, mockDeleteFile } = vi.hoisted(
  () => {
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
      mockDeleteMeetingCollection: vi.fn().mockResolvedValue(undefined),
      mockDeleteFile: vi.fn().mockResolvedValue(undefined),
    };
  }
);

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/vector/collections", () => ({
  deleteMeetingCollection: mockDeleteMeetingCollection,
}));
vi.mock("@/lib/vector/agenda", () => ({
  upsertAgenda: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/storage/operations", () => ({
  deleteFile: mockDeleteFile,
}));

import { GET, PATCH, DELETE } from "./route";

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe("GET /api/meetings/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns meeting when found", async () => {
    mockDb.where.mockResolvedValueOnce([fakeMeeting()]);

    const req = new Request("http://localhost/api/meetings/1");
    const response = await GET(req, makeParams("1"));
    const { status, data } = await parseJsonResponse(response);

    expect(status).toBe(200);
    expect(data.title).toBe("Test Meeting");
  });

  it("returns 404 when not found", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/meetings/999");
    const response = await GET(req, makeParams("999"));
    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/meetings/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates allowed fields (title, joinLink)", async () => {
    mockDb.where
      .mockResolvedValueOnce([fakeMeeting()])
      .mockReturnValueOnce(mockDb);
    mockDb.returning.mockResolvedValueOnce([fakeMeeting({ title: "Updated" })]);

    const req = createJsonRequest("http://localhost/api/meetings/1", {
      method: "PATCH",
      body: { title: "Updated" },
    });
    const response = await PATCH(req, makeParams("1"));
    const { status, data } = await parseJsonResponse(response);

    expect(status).toBe(200);
    expect(data.title).toBe("Updated");

    // Verify set was called with title and updatedAt
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Updated" })
    );
  });

  it("ignores non-allowlisted fields (status, userId, qdrantCollectionName)", async () => {
    mockDb.where
      .mockResolvedValueOnce([fakeMeeting()])
      .mockReturnValueOnce(mockDb);
    mockDb.returning.mockResolvedValueOnce([fakeMeeting()]);

    const req = createJsonRequest("http://localhost/api/meetings/1", {
      method: "PATCH",
      body: {
        title: "Good",
        status: "completed",
        userId: "attacker-id",
        qdrantCollectionName: "hacked",
      },
    });
    await PATCH(req, makeParams("1"));

    const setCall = mockDb.set.mock.calls[0][0];
    expect(setCall.title).toBe("Good");
    expect(setCall.status).toBeUndefined();
    expect(setCall.userId).toBeUndefined();
    expect(setCall.qdrantCollectionName).toBeUndefined();
  });

  it("returns 404 when meeting not found", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    const req = createJsonRequest("http://localhost/api/meetings/999", {
      method: "PATCH",
      body: { title: "X" },
    });
    const response = await PATCH(req, makeParams("999"));
    expect(response.status).toBe(404);
  });

  it("sets muted in metadata for active meetings", async () => {
    mockDb.where
      .mockResolvedValueOnce([
        fakeMeeting({ status: "active", metadata: { botId: "bot-1" } }),
      ])
      .mockReturnValueOnce(mockDb);
    mockDb.returning.mockResolvedValueOnce([
      fakeMeeting({
        status: "active",
        metadata: { botId: "bot-1", muted: true },
      }),
    ]);

    const req = createJsonRequest("http://localhost/api/meetings/1", {
      method: "PATCH",
      body: { muted: true },
    });
    const { status, data } = await parseJsonResponse(
      await PATCH(req, makeParams("1"))
    );

    expect(status).toBe(200);
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ muted: true }),
      })
    );
    expect(data.metadata.muted).toBe(true);
  });

  it("ignores muted for non-active meetings", async () => {
    mockDb.where
      .mockResolvedValueOnce([fakeMeeting({ status: "pending" })])
      .mockReturnValueOnce(mockDb);
    mockDb.returning.mockResolvedValueOnce([fakeMeeting()]);

    const req = createJsonRequest("http://localhost/api/meetings/1", {
      method: "PATCH",
      body: { muted: true },
    });
    await PATCH(req, makeParams("1"));

    const setCall = mockDb.set.mock.calls[0][0];
    expect(setCall.metadata).toBeUndefined();
  });

  it("rejects agenda longer than 10000 characters", async () => {
    mockDb.where.mockResolvedValueOnce([fakeMeeting()]);

    const req = createJsonRequest("http://localhost/api/meetings/1", {
      method: "PATCH",
      body: { agenda: "x".repeat(10001) },
    });
    const response = await PATCH(req, makeParams("1"));
    expect(response.status).toBe(400);
  });

  it("allows toggling silent only for pending/failed meetings", async () => {
    mockDb.where
      .mockResolvedValueOnce([fakeMeeting({ status: "active" })])
      .mockReturnValueOnce(mockDb);
    mockDb.returning.mockResolvedValueOnce([fakeMeeting({ status: "active" })]);

    const req = createJsonRequest("http://localhost/api/meetings/1", {
      method: "PATCH",
      body: { silent: true },
    });
    await PATCH(req, makeParams("1"));

    const setCall = mockDb.set.mock.calls[0][0];
    // silent should not appear in metadata for active meeting
    expect(setCall.metadata).toBeUndefined();
  });
});

describe("DELETE /api/meetings/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes Qdrant collection and meeting-scoped S3 files", async () => {
    const meeting = fakeMeeting({
      qdrantCollectionName: "meeting_abc123",
    });
    mockDb.where
      .mockResolvedValueOnce([meeting]) // SELECT meeting
      .mockResolvedValueOnce([
        { id: "d1", s3Key: "knowledge/user/d1/file.pdf" },
        { id: "d2", s3Key: "knowledge/user/d2/file.txt" },
      ]) // SELECT meeting-scoped docs
      .mockResolvedValueOnce(undefined) // DELETE documents
      .mockResolvedValueOnce(undefined); // DELETE meetings

    const req = new Request("http://localhost/api/meetings/1", {
      method: "DELETE",
    });
    const response = await DELETE(req, makeParams("1"));
    const { status, data } = await parseJsonResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);

    // Verify Qdrant collection was deleted with the correct name
    expect(mockDeleteMeetingCollection).toHaveBeenCalledWith("meeting_abc123");

    // Verify S3 files were cleaned up
    expect(mockDeleteFile).toHaveBeenCalledTimes(2);
    expect(mockDeleteFile).toHaveBeenCalledWith("knowledge/user/d1/file.pdf");
    expect(mockDeleteFile).toHaveBeenCalledWith("knowledge/user/d2/file.txt");
  });

  it("skips document cleanup when no meeting-scoped docs exist", async () => {
    mockDb.where
      .mockResolvedValueOnce([fakeMeeting()]) // SELECT meeting
      .mockResolvedValueOnce([]) // SELECT meeting-scoped docs (none)
      .mockResolvedValueOnce(undefined); // DELETE meetings

    const req = new Request("http://localhost/api/meetings/1", {
      method: "DELETE",
    });
    const response = await DELETE(req, makeParams("1"));
    expect(response.status).toBe(200);

    expect(mockDeleteFile).not.toHaveBeenCalled();
    expect(mockDeleteMeetingCollection).toHaveBeenCalledOnce();
  });

  it("returns 404 when meeting not found", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/meetings/999", {
      method: "DELETE",
    });
    const response = await DELETE(req, makeParams("999"));
    expect(response.status).toBe(404);
  });
});
