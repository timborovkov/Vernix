import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDb = vi.hoisted(() => {
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
  return db;
});

vi.mock("@/lib/db", () => ({ db: mockDb }));

import { runOrphanSweeper } from "./orphan-sweeper";

describe("runOrphanSweeper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns zero when no orphans found", async () => {
    // Usage events query returns empty
    mockDb.limit.mockResolvedValueOnce([]);
    // Orphaned docs query returns empty
    mockDb.limit.mockResolvedValueOnce([]);

    const result = await runOrphanSweeper();

    expect(result.cleaned).toBe(0);
  });

  it("deletes orphaned usage events via bounded select + delete", async () => {
    mockDb.limit.mockResolvedValueOnce([
      { id: "evt-1" },
      { id: "evt-2" },
      { id: "evt-3" },
    ]);
    // Orphaned docs query returns empty
    mockDb.limit.mockResolvedValueOnce([]);

    const result = await runOrphanSweeper();

    expect(result.cleaned).toBe(3);
    // Verify delete was called (via inArray)
    expect(mockDb.delete).toHaveBeenCalled();
  });

  it("re-parents orphaned documents by setting meetingId to null", async () => {
    // No orphaned usage events
    mockDb.limit.mockResolvedValueOnce([]);
    // Orphaned docs
    mockDb.limit.mockResolvedValueOnce([
      { id: "doc-1", meetingId: "deleted-meeting" },
    ]);

    const result = await runOrphanSweeper();

    expect(result.cleaned).toBe(1);
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ meetingId: null })
    );
  });

  it("handles errors in usage event cleanup without aborting doc cleanup", async () => {
    // Usage events query fails
    mockDb.limit
      .mockRejectedValueOnce(new Error("DB error"))
      // Orphaned docs
      .mockResolvedValueOnce([{ id: "doc-1", meetingId: "deleted-meeting" }]);

    const result = await runOrphanSweeper();

    // Only doc cleanup counted
    expect(result.cleaned).toBe(1);
  });

  it("handles errors in usage event cleanup without crashing doc cleanup", async () => {
    // Usage events SELECT throws
    mockDb.limit.mockRejectedValueOnce(new Error("DB error"));
    // Orphaned docs query succeeds
    mockDb.limit.mockResolvedValueOnce([
      { id: "doc-1", meetingId: "deleted-meeting" },
    ]);

    const result = await runOrphanSweeper();

    // Doc cleanup still ran despite usage event error
    expect(result.cleaned).toBe(1);
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ meetingId: null })
    );
  });
});
