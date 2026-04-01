import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDb, mockListObjects, mockDeleteFile } = vi.hoisted(() => {
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
    "limit",
  ]) {
    db[m] = vi.fn().mockImplementation(() => db);
  }
  return {
    mockDb: db,
    mockListObjects: vi.fn().mockResolvedValue([]),
    mockDeleteFile: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/storage/operations", () => ({
  listObjects: mockListObjects,
  deleteFile: mockDeleteFile,
}));

import { runStorageCleanup } from "./storage-cleanup";

// Valid UUID for test data
const validDocId = "c2aadd11-2b3c-4ef8-bb6d-8dd1df602c33";
const validMeetingId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

describe("runStorageCleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns zero when no objects exist", async () => {
    const result = await runStorageCleanup();

    expect(result.deleted).toBe(0);
    expect(mockListObjects).toHaveBeenCalledWith("knowledge/", 500);
    expect(mockListObjects).toHaveBeenCalledWith("recordings/", 500);
  });

  it("deletes orphaned knowledge file when document not found", async () => {
    mockListObjects
      .mockResolvedValueOnce([`knowledge/user1/${validDocId}/file.pdf`])
      .mockResolvedValueOnce([]); // no recordings
    // Not found by s3Key, not found by docId
    mockDb.limit.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const result = await runStorageCleanup();

    expect(result.deleted).toBe(1);
    expect(mockDeleteFile).toHaveBeenCalledWith(
      `knowledge/user1/${validDocId}/file.pdf`
    );
  });

  it("does not delete knowledge file when document exists by s3Key", async () => {
    mockListObjects
      .mockResolvedValueOnce([`knowledge/user1/${validDocId}/file.pdf`])
      .mockResolvedValueOnce([]);
    // Found by s3Key on first lookup
    mockDb.limit.mockResolvedValueOnce([{ id: validDocId }]);

    const result = await runStorageCleanup();

    expect(result.deleted).toBe(0);
    expect(mockDeleteFile).not.toHaveBeenCalled();
  });

  it("deletes orphaned recording when meeting not found", async () => {
    mockListObjects
      .mockResolvedValueOnce([]) // no knowledge files
      .mockResolvedValueOnce([`recordings/${validMeetingId}.mp4`]);
    // Not found by recordingKey metadata, not found by meeting ID
    mockDb.limit.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const result = await runStorageCleanup();

    expect(result.deleted).toBe(1);
    expect(mockDeleteFile).toHaveBeenCalledWith(
      `recordings/${validMeetingId}.mp4`
    );
  });

  it("does not delete recording when meeting still exists by ID", async () => {
    mockListObjects
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([`recordings/${validMeetingId}.mp4`]);
    // Not found by recordingKey metadata
    mockDb.limit
      .mockResolvedValueOnce([])
      // But found by meeting ID
      .mockResolvedValueOnce([{ id: validMeetingId }]);

    const result = await runStorageCleanup();

    expect(result.deleted).toBe(0);
  });

  it("skips non-UUID doc IDs without crashing", async () => {
    mockListObjects
      .mockResolvedValueOnce(["knowledge/user1/not-a-uuid/file.pdf"])
      .mockResolvedValueOnce([]);
    // Not found by s3Key — UUID check is skipped for invalid ID
    mockDb.limit.mockResolvedValueOnce([]);

    const result = await runStorageCleanup();

    // Deleted because s3Key not found and UUID check was skipped
    expect(result.deleted).toBe(1);
  });

  it("continues processing when one item fails", async () => {
    mockListObjects
      .mockResolvedValueOnce([
        `knowledge/user1/${validDocId}/a.pdf`,
        `knowledge/user2/${validDocId}/b.pdf`,
      ])
      .mockResolvedValueOnce([]);
    // First file: s3Key not found, docId not found → delete fails
    mockDb.limit.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    mockDeleteFile.mockRejectedValueOnce(new Error("S3 error"));
    // Second file: s3Key not found, docId not found → delete succeeds
    mockDb.limit.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const result = await runStorageCleanup();

    // First failed, second succeeded
    expect(result.deleted).toBe(1);
    expect(mockDeleteFile).toHaveBeenCalledTimes(2);
  });
});
