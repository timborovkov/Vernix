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
  ]) {
    db[m] = vi.fn().mockImplementation(() => db);
  }
  return db;
});

vi.mock("@/lib/db", () => ({ db: mockDb }));

import { runInactiveCleanup } from "./inactive-cleanup";

describe("runInactiveCleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns zero when no inactive users found", async () => {
    mockDb.limit.mockResolvedValueOnce([]);

    const result = await runInactiveCleanup();

    expect(result.flagged).toBe(0);
  });

  it("flags users with no recent meetings", async () => {
    mockDb.limit.mockResolvedValueOnce([
      { id: "user-1", email: "old@example.com", lastActiveAt: null },
    ]);
    // No recent meetings for user-1
    mockDb.limit.mockResolvedValueOnce([]);

    const result = await runInactiveCleanup();

    expect(result.flagged).toBe(1);
  });

  it("does not flag users who have recent meetings", async () => {
    mockDb.limit.mockResolvedValueOnce([
      { id: "user-1", email: "old@example.com", lastActiveAt: null },
    ]);
    // User has a recent meeting
    mockDb.limit.mockResolvedValueOnce([{ id: "meeting-1" }]);

    const result = await runInactiveCleanup();

    expect(result.flagged).toBe(0);
  });
});
