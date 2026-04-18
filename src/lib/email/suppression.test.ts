import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDb } = vi.hoisted(() => {
  const db: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of [
    "select",
    "from",
    "where",
    "insert",
    "values",
    "returning",
    "update",
    "set",
  ]) {
    db[m] = vi.fn().mockImplementation(() => db);
  }
  return { mockDb: db };
});
vi.mock("@/lib/db", () => ({ db: mockDb }));

function resetDbChain() {
  for (const m of Object.keys(mockDb)) {
    mockDb[m].mockReset().mockImplementation(() => mockDb);
  }
}

import { suppressEmail, filterSuppressedEmails } from "./suppression";

describe("suppressEmail", () => {
  beforeEach(resetDbChain);

  it("updates email_bounced_at on bounce and normalizes the address", async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: "user-1" }]);

    await suppressEmail("  Bouncer@Example.COM ", "bounce");

    expect(mockDb.update).toHaveBeenCalledTimes(1);
    const setArg = mockDb.set.mock.calls[0][0];
    expect(setArg).toHaveProperty("emailBouncedAt");
    expect(setArg).toHaveProperty("updatedAt");
    expect(setArg).not.toHaveProperty("emailComplainedAt");
    expect(mockDb.returning).toHaveBeenCalled();
  });

  it("no-ops on bounce for an unknown address (no throw)", async () => {
    mockDb.returning.mockResolvedValueOnce([]);
    await expect(
      suppressEmail("ghost@example.com", "bounce")
    ).resolves.toBeUndefined();
  });

  it("flips marketing/product prefs and sets email_complained_at on complaint", async () => {
    mockDb.where.mockResolvedValueOnce([
      {
        id: "user-2",
        emailPreferences: { marketing: true, product: true },
      },
    ]);

    await suppressEmail("complainer@example.com", "complaint");

    expect(mockDb.update).toHaveBeenCalledTimes(1);
    const setArg = mockDb.set.mock.calls[0][0];
    expect(setArg.emailPreferences).toEqual({
      marketing: false,
      product: false,
    });
    expect(setArg).toHaveProperty("emailComplainedAt");
    expect(setArg).toHaveProperty("updatedAt");
  });

  it("preserves unrelated preference keys on complaint", async () => {
    mockDb.where.mockResolvedValueOnce([
      {
        id: "user-3",
        emailPreferences: { marketing: true, product: true, other: true },
      },
    ]);

    await suppressEmail("x@example.com", "complaint");

    const setArg = mockDb.set.mock.calls[0][0];
    expect(setArg.emailPreferences).toMatchObject({
      marketing: false,
      product: false,
      other: true,
    });
  });

  it("no-ops on complaint for unknown address", async () => {
    mockDb.where.mockResolvedValueOnce([]);
    await suppressEmail("ghost@example.com", "complaint");
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("ignores empty/whitespace addresses", async () => {
    await suppressEmail("   ", "bounce");
    await suppressEmail("", "complaint");
    expect(mockDb.update).not.toHaveBeenCalled();
    expect(mockDb.select).not.toHaveBeenCalled();
  });
});

describe("filterSuppressedEmails", () => {
  beforeEach(resetDbChain);

  it("returns empty lists for empty input", async () => {
    const result = await filterSuppressedEmails([]);
    expect(result).toEqual({ allowed: [], suppressed: [] });
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it("partitions a recipient list into allowed vs suppressed", async () => {
    mockDb.where.mockResolvedValueOnce([{ email: "blocked@example.com" }]);

    const result = await filterSuppressedEmails([
      "ok@example.com",
      "Blocked@Example.com",
    ]);

    expect(result.allowed).toEqual(["ok@example.com"]);
    expect(result.suppressed).toEqual(["Blocked@Example.com"]);
  });

  it("preserves caller casing in the partitioned output", async () => {
    mockDb.where.mockResolvedValueOnce([{ email: "user@example.com" }]);

    const result = await filterSuppressedEmails(["User@Example.com"]);

    expect(result.suppressed).toEqual(["User@Example.com"]);
    expect(result.allowed).toEqual([]);
  });

  it("returns all addresses as allowed when none are suppressed", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    const result = await filterSuppressedEmails([
      "a@example.com",
      "b@example.com",
    ]);

    expect(result.allowed).toEqual(["a@example.com", "b@example.com"]);
    expect(result.suppressed).toEqual([]);
  });
});
