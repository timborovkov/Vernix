import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDb, mockSyncUsageToPolar } = vi.hoisted(() => {
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
    "innerJoin",
  ]) {
    db[m] = vi.fn().mockImplementation(() => db);
  }
  return {
    mockDb: db,
    mockSyncUsageToPolar: vi.fn().mockResolvedValue(true),
  };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/billing/usage", () => ({
  syncUsageToPolar: mockSyncUsageToPolar,
}));

import { runBillingRetry } from "./billing-retry";

describe("runBillingRetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns zero when no unsynced events", async () => {
    mockDb.limit.mockResolvedValueOnce([]);

    const result = await runBillingRetry();

    expect(result.retried).toBe(0);
  });

  it("calls syncUsageToPolar with correct params for each unsynced event", async () => {
    mockDb.limit.mockResolvedValueOnce([
      {
        id: "evt-1",
        userId: "user-1",
        meetingId: "meeting-1",
        type: "voice_meeting",
        quantity: "45",
      },
      {
        id: "evt-2",
        userId: "user-2",
        meetingId: "meeting-2",
        type: "silent_meeting",
        quantity: "30",
      },
    ]);

    const result = await runBillingRetry();

    expect(result.retried).toBe(2);
    expect(mockSyncUsageToPolar).toHaveBeenCalledWith(
      "user-1",
      "meeting-1",
      "voice_meeting",
      45
    );
    expect(mockSyncUsageToPolar).toHaveBeenCalledWith(
      "user-2",
      "meeting-2",
      "silent_meeting",
      30
    );
  });

  it("skips events with null meetingId", async () => {
    mockDb.limit.mockResolvedValueOnce([
      {
        id: "evt-1",
        userId: "user-1",
        meetingId: null,
        type: "voice_meeting",
        quantity: "45",
      },
    ]);

    const result = await runBillingRetry();

    expect(result.retried).toBe(0);
    expect(mockSyncUsageToPolar).not.toHaveBeenCalled();
  });

  it("does not count events where sync returns false", async () => {
    mockDb.limit.mockResolvedValueOnce([
      {
        id: "evt-1",
        userId: "user-1",
        meetingId: "m-1",
        type: "voice_meeting",
        quantity: "30",
      },
      {
        id: "evt-2",
        userId: "user-2",
        meetingId: "m-2",
        type: "silent_meeting",
        quantity: "20",
      },
    ]);
    // First sync fails (returns false), second succeeds (returns true)
    mockSyncUsageToPolar
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const result = await runBillingRetry();

    expect(result.retried).toBe(1);
    expect(mockSyncUsageToPolar).toHaveBeenCalledTimes(2);
  });
});
