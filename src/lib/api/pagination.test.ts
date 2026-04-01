import { describe, it, expect } from "vitest";
import {
  encodeCursor,
  decodeCursor,
  buildPaginationMeta,
  paginationSchema,
} from "./pagination";

describe("cursor encoding/decoding", () => {
  it("round-trips a cursor", () => {
    const date = new Date("2026-03-15T12:00:00Z");
    const id = "abc-123";
    const cursor = encodeCursor(date, id);
    const decoded = decodeCursor(cursor);

    expect(decoded).not.toBeNull();
    expect(decoded!.createdAt).toBe(date.toISOString());
    expect(decoded!.id).toBe(id);
  });

  it("returns null for invalid base64", () => {
    expect(decodeCursor("not-valid-base64!!!")).toBeNull();
  });

  it("returns null for valid base64 but invalid JSON", () => {
    const encoded = Buffer.from("not json").toString("base64url");
    expect(decodeCursor(encoded)).toBeNull();
  });

  it("returns null for missing fields", () => {
    const encoded = Buffer.from(JSON.stringify({ id: "x" })).toString(
      "base64url"
    );
    expect(decodeCursor(encoded)).toBeNull();
  });

  it("returns null for invalid date", () => {
    const encoded = Buffer.from(
      JSON.stringify({ createdAt: "not-a-date", id: "x" })
    ).toString("base64url");
    expect(decodeCursor(encoded)).toBeNull();
  });
});

describe("buildPaginationMeta", () => {
  it("returns hasMore=false when items <= limit", () => {
    const items = [
      { id: "1", createdAt: new Date("2026-01-01") },
      { id: "2", createdAt: new Date("2026-01-02") },
    ];
    const result = buildPaginationMeta(items, 5);

    expect(result.data).toHaveLength(2);
    expect(result.meta.hasMore).toBe(false);
    expect(result.meta.nextCursor).toBeUndefined();
  });

  it("returns hasMore=true and trims when items > limit", () => {
    const items = [
      { id: "1", createdAt: new Date("2026-01-03") },
      { id: "2", createdAt: new Date("2026-01-02") },
      { id: "3", createdAt: new Date("2026-01-01") },
    ];
    const result = buildPaginationMeta(items, 2);

    expect(result.data).toHaveLength(2);
    expect(result.meta.hasMore).toBe(true);
    expect(result.meta.nextCursor).toBeDefined();

    // Cursor should point to the last item in the trimmed set
    const decoded = decodeCursor(result.meta.nextCursor!);
    expect(decoded!.id).toBe("2");
  });

  it("handles empty array", () => {
    const result = buildPaginationMeta([], 20);
    expect(result.data).toHaveLength(0);
    expect(result.meta.hasMore).toBe(false);
  });
});

describe("paginationSchema", () => {
  it("applies defaults", () => {
    const result = paginationSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
      expect(result.data.cursor).toBeUndefined();
    }
  });

  it("rejects limit > 100", () => {
    const result = paginationSchema.safeParse({ limit: "101" });
    expect(result.success).toBe(false);
  });

  it("rejects limit < 1", () => {
    const result = paginationSchema.safeParse({ limit: "0" });
    expect(result.success).toBe(false);
  });

  it("coerces string to number", () => {
    const result = paginationSchema.safeParse({ limit: "50" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.limit).toBe(50);
  });
});
