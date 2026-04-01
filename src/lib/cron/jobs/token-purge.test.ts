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

import { runTokenPurge } from "./token-purge";

describe("runTokenPurge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns zero when no expired tokens", async () => {
    mockDb.returning.mockResolvedValueOnce([]);

    const result = await runTokenPurge();

    expect(result.purged).toBe(0);
  });

  it("deletes expired tokens and returns count", async () => {
    mockDb.returning.mockResolvedValueOnce([
      { id: "t1" },
      { id: "t2" },
      { id: "t3" },
    ]);

    const result = await runTokenPurge();

    expect(result.purged).toBe(3);
    expect(mockDb.delete).toHaveBeenCalled();
  });
});
