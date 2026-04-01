import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDb, mockRecordMeetingUsage } = vi.hoisted(() => {
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
    "leftJoin",
  ]) {
    db[m] = vi.fn().mockImplementation(() => db);
  }
  return {
    mockDb: db,
    mockRecordMeetingUsage: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/billing/usage", () => ({
  recordMeetingUsage: mockRecordMeetingUsage,
}));

import { runUsageAudit } from "./usage-audit";

describe("runUsageAudit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns zero when no missing usage events", async () => {
    mockDb.limit.mockResolvedValueOnce([]);

    const result = await runUsageAudit();

    expect(result.repaired).toBe(0);
  });

  it("backfills missing usage events with correct duration and type", async () => {
    const startedAt = new Date("2026-03-30T10:00:00Z");
    const endedAt = new Date("2026-03-30T10:45:00Z"); // 45 minutes
    mockDb.limit.mockResolvedValueOnce([
      {
        id: "meeting-1",
        userId: "user-1",
        startedAt,
        endedAt,
        metadata: { silent: false },
      },
    ]);

    const result = await runUsageAudit();

    expect(result.repaired).toBe(1);
    expect(mockRecordMeetingUsage).toHaveBeenCalledWith(
      "user-1",
      "meeting-1",
      "voice_meeting",
      45
    );
  });

  it("uses silent_meeting type for silent meetings", async () => {
    const startedAt = new Date("2026-03-30T10:00:00Z");
    const endedAt = new Date("2026-03-30T10:30:00Z");
    mockDb.limit.mockResolvedValueOnce([
      {
        id: "meeting-1",
        userId: "user-1",
        startedAt,
        endedAt,
        metadata: { silent: true },
      },
    ]);

    await runUsageAudit();

    expect(mockRecordMeetingUsage).toHaveBeenCalledWith(
      "user-1",
      "meeting-1",
      "silent_meeting",
      30
    );
  });

  it("skips meetings with null userId", async () => {
    mockDb.limit.mockResolvedValueOnce([
      {
        id: "meeting-1",
        userId: null,
        startedAt: new Date(),
        endedAt: new Date(),
        metadata: {},
      },
    ]);

    const result = await runUsageAudit();

    expect(result.repaired).toBe(0);
    expect(mockRecordMeetingUsage).not.toHaveBeenCalled();
  });
});
