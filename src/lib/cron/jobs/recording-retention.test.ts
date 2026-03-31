import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDb, mockDeleteFile, mockProvider } = vi.hoisted(() => {
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
    mockDeleteFile: vi.fn().mockResolvedValue(undefined),
    mockProvider: {
      joinMeeting: vi.fn(),
      leaveMeeting: vi.fn(),
      onTranscript: vi.fn(),
      deleteBot: vi.fn().mockResolvedValue(undefined),
    },
  };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/storage/operations", () => ({
  deleteFile: mockDeleteFile,
}));
vi.mock("@/lib/meeting-bot", () => ({
  getMeetingBotProvider: () => mockProvider,
}));

import { runRecordingRetention } from "./recording-retention";

describe("runRecordingRetention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RECORDING_RETENTION_DAYS", "90");
  });

  it("returns zero deleted when no expired meetings found", async () => {
    mockDb.limit.mockResolvedValueOnce([]);

    const result = await runRecordingRetention();

    expect(result.deleted).toBe(0);
    expect(result.retentionDays).toBe(90);
  });

  it("deletes S3 file and clears recordingKey for valid meeting", async () => {
    mockDb.limit.mockResolvedValueOnce([
      {
        id: "meeting-1",
        userId: "user-1",
        metadata: { recordingKey: "recordings/abc.mp4", botId: "bot-1" },
      },
    ]);

    const result = await runRecordingRetention();

    expect(result.deleted).toBe(1);
    expect(mockDeleteFile).toHaveBeenCalledWith("recordings/abc.mp4");
    expect(mockProvider.deleteBot).toHaveBeenCalledWith("bot-1");
    // Verify metadata was cleared of recordingKey
    const setCall = mockDb.set.mock.calls[0][0];
    expect(setCall.metadata).not.toHaveProperty("recordingKey");
    expect(setCall.metadata).toHaveProperty("botId", "bot-1");
  });

  it("skips metadata update when S3 delete fails (prevents orphaned files)", async () => {
    mockDb.limit.mockResolvedValueOnce([
      {
        id: "meeting-1",
        userId: "user-1",
        metadata: { recordingKey: "recordings/abc.mp4" },
      },
    ]);
    mockDeleteFile.mockRejectedValueOnce(new Error("S3 timeout"));

    const result = await runRecordingRetention();

    // Should NOT have updated the DB — meeting will be retried next run
    expect(result.deleted).toBe(0);
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("skips meetings with null userId (prevents infinite reprocessing)", async () => {
    mockDb.limit.mockResolvedValueOnce([
      {
        id: "meeting-orphan",
        userId: null,
        metadata: { recordingKey: "recordings/orphan.mp4" },
      },
    ]);

    const result = await runRecordingRetention();

    // Should skip entirely — no S3 delete, no DB update
    expect(result.deleted).toBe(0);
    expect(mockDeleteFile).not.toHaveBeenCalled();
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("processes multiple meetings, skipping failures", async () => {
    mockDb.limit.mockResolvedValueOnce([
      {
        id: "m1",
        userId: "user-1",
        metadata: { recordingKey: "rec/1.mp4" },
      },
      {
        id: "m2",
        userId: null, // null userId — skip
        metadata: { recordingKey: "rec/2.mp4" },
      },
      {
        id: "m3",
        userId: "user-3",
        metadata: { recordingKey: "rec/3.mp4" },
      },
    ]);
    // m1 S3 delete fails
    mockDeleteFile
      .mockRejectedValueOnce(new Error("S3 error"))
      .mockResolvedValueOnce(undefined);
    const result = await runRecordingRetention();

    // m1: S3 fail → skipped, m2: null userId → skipped, m3: success
    expect(result.deleted).toBe(1);
    // S3 delete called for m1 and m3, not m2
    expect(mockDeleteFile).toHaveBeenCalledTimes(2);
    expect(mockDeleteFile).toHaveBeenCalledWith("rec/1.mp4");
    expect(mockDeleteFile).toHaveBeenCalledWith("rec/3.mp4");
  });

  it("reads RECORDING_RETENTION_DAYS from env", async () => {
    vi.stubEnv("RECORDING_RETENTION_DAYS", "30");
    mockDb.limit.mockResolvedValueOnce([]);

    const result = await runRecordingRetention();

    expect(result.retentionDays).toBe(30);
  });

  it("does not call deleteBot when no botId in metadata", async () => {
    mockDb.limit.mockResolvedValueOnce([
      {
        id: "meeting-1",
        userId: "user-1",
        metadata: { recordingKey: "recordings/abc.mp4" },
      },
    ]);
    await runRecordingRetention();

    expect(mockProvider.deleteBot).not.toHaveBeenCalled();
  });
});
