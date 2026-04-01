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

import { runDocumentWatchdog } from "./document-watchdog";

describe("runDocumentWatchdog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns zero when no stuck documents", async () => {
    mockDb.limit.mockResolvedValueOnce([]);

    const result = await runDocumentWatchdog();

    expect(result.marked).toBe(0);
  });

  it("marks stuck documents as failed with timeout error", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "doc-1" }, { id: "doc-2" }]);
    // returning() must resolve to an array for destructuring
    mockDb.returning
      .mockResolvedValueOnce([{ id: "doc-1" }])
      .mockResolvedValueOnce([{ id: "doc-2" }]);

    const result = await runDocumentWatchdog();

    expect(result.marked).toBe(2);
    // Verify it sets status to failed with timeout message
    const setCalls = mockDb.set.mock.calls;
    expect(setCalls[0][0]).toEqual(
      expect.objectContaining({
        status: "failed",
        error: "Processing timed out",
      })
    );
  });

  it("continues processing when one update fails", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "doc-1" }, { id: "doc-2" }]);
    // First returning() rejects (doc-1 fails), second succeeds (doc-2)
    mockDb.returning
      .mockRejectedValueOnce(new Error("DB error"))
      .mockResolvedValueOnce([{ id: "doc-2" }]);

    const result = await runDocumentWatchdog();

    expect(result.marked).toBe(1);
  });
});
