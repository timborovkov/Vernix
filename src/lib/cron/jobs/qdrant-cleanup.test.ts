import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDb, mockQdrant } = vi.hoisted(() => {
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
    mockQdrant: {
      getCollections: vi.fn().mockResolvedValue({ collections: [] }),
      deleteCollection: vi.fn().mockResolvedValue(undefined),
    },
  };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/vector/client", () => ({
  getQdrantClient: () => mockQdrant,
}));

import { runQdrantCleanup } from "./qdrant-cleanup";

describe("runQdrantCleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns zero when no collections exist", async () => {
    const result = await runQdrantCleanup();

    expect(result.deleted).toBe(0);
    expect(result.scanned).toBe(0);
  });

  it("does not delete collections that have matching DB records", async () => {
    mockQdrant.getCollections.mockResolvedValueOnce({
      collections: [{ name: "meeting_a0eebc999c0b4ef8bb6d6bb9bd380a11" }],
    });
    // Meeting exists in DB
    mockDb.limit.mockResolvedValueOnce([{ id: "exists" }]);

    const result = await runQdrantCleanup();

    expect(result.deleted).toBe(0);
    expect(mockQdrant.deleteCollection).not.toHaveBeenCalled();
  });

  it("deletes orphaned meeting collection when not found in DB", async () => {
    mockQdrant.getCollections.mockResolvedValueOnce({
      collections: [{ name: "meeting_a0eebc999c0b4ef8bb6d6bb9bd380a11" }],
    });
    // Not found by qdrantCollectionName
    mockDb.limit.mockResolvedValueOnce([]);

    const result = await runQdrantCleanup();

    expect(result.deleted).toBe(1);
    expect(mockQdrant.deleteCollection).toHaveBeenCalledWith(
      "meeting_a0eebc999c0b4ef8bb6d6bb9bd380a11"
    );
  });

  it("deletes orphaned knowledge collection when user not found", async () => {
    mockQdrant.getCollections.mockResolvedValueOnce({
      collections: [{ name: "knowledge_b1ffcd001a2b4ef8bb6d7cc0ce491b22" }],
    });
    // User not found
    mockDb.limit.mockResolvedValueOnce([]);

    const result = await runQdrantCleanup();

    expect(result.deleted).toBe(1);
    expect(mockQdrant.deleteCollection).toHaveBeenCalledWith(
      "knowledge_b1ffcd001a2b4ef8bb6d7cc0ce491b22"
    );
  });

  it("skips collections with unrecognized prefixes", async () => {
    mockQdrant.getCollections.mockResolvedValueOnce({
      collections: [{ name: "other_collection" }],
    });

    const result = await runQdrantCleanup();

    expect(result.deleted).toBe(0);
    expect(mockQdrant.deleteCollection).not.toHaveBeenCalled();
  });

  it("respects max deletion limit of 20", async () => {
    const collections = Array.from({ length: 25 }, (_, i) => ({
      name: `meeting_${String(i).padStart(32, "0")}`,
    }));
    mockQdrant.getCollections.mockResolvedValueOnce({ collections });
    // All are orphaned (not found by name or UUID)
    mockDb.limit.mockResolvedValue([]);

    const result = await runQdrantCleanup();

    expect(result.deleted).toBe(20);
    expect(mockQdrant.deleteCollection).toHaveBeenCalledTimes(20);
  });
});
