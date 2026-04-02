import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "crypto";

const { mockDb } = vi.hoisted(() => {
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
  return { mockDb: db };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));

import {
  hashVerificationToken,
  generateVerificationToken,
  createEmailVerificationToken,
} from "./email-verification";

describe("email-verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("hashVerificationToken", () => {
    it("produces consistent SHA-256 hash for same input", () => {
      const hash1 = hashVerificationToken("my-token");
      const hash2 = hashVerificationToken("my-token");
      expect(hash1).toBe(hash2);
    });

    it("matches expected SHA-256 output", () => {
      const input = "test-token-123";
      const expected = createHash("sha256").update(input).digest("hex");
      expect(hashVerificationToken(input)).toBe(expected);
    });

    it("produces different hashes for different inputs", () => {
      const a = hashVerificationToken("token-a");
      const b = hashVerificationToken("token-b");
      expect(a).not.toBe(b);
    });

    it("returns a 64-char hex string", () => {
      const hash = hashVerificationToken("anything");
      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });
  });

  describe("generateVerificationToken", () => {
    it("returns token and matching hash", () => {
      const { token, tokenHash } = generateVerificationToken();
      expect(tokenHash).toBe(hashVerificationToken(token));
    });

    it("generates a 64-char hex raw token (32 random bytes)", () => {
      const { token } = generateVerificationToken();
      expect(token).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(token)).toBe(true);
    });

    it("generates unique tokens each call", () => {
      const a = generateVerificationToken();
      const b = generateVerificationToken();
      expect(a.token).not.toBe(b.token);
      expect(a.tokenHash).not.toBe(b.tokenHash);
    });
  });

  describe("createEmailVerificationToken", () => {
    it("cleans expired tokens first", async () => {
      mockDb.values.mockResolvedValueOnce(undefined);

      await createEmailVerificationToken("user-1");

      // First delete call: clean expired tokens
      expect(mockDb.delete).toHaveBeenCalled();
      // Should have been called at least twice (expired cleanup + user token cleanup)
      expect(mockDb.delete).toHaveBeenCalledTimes(2);
    });

    it("deletes existing tokens for the user", async () => {
      mockDb.values.mockResolvedValueOnce(undefined);

      await createEmailVerificationToken("user-1");

      // Two delete calls: expired cleanup + user-specific cleanup
      expect(mockDb.delete).toHaveBeenCalledTimes(2);
    });

    it("inserts a new token with correct fields", async () => {
      mockDb.values.mockResolvedValueOnce(undefined);

      const rawToken = await createEmailVerificationToken("user-1");

      // Verify insert was called
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          tokenHash: expect.any(String),
          expiresAt: expect.any(Date),
        })
      );

      // Verify the inserted tokenHash matches the returned raw token
      const insertedValues = mockDb.values.mock.calls[0][0];
      expect(insertedValues.tokenHash).toBe(hashVerificationToken(rawToken));
    });

    it("token expiry is approximately 24 hours", async () => {
      mockDb.values.mockResolvedValueOnce(undefined);

      const before = Date.now();
      await createEmailVerificationToken("user-1");
      const after = Date.now();

      const insertedValues = mockDb.values.mock.calls[0][0];
      const expiresAt = insertedValues.expiresAt.getTime();

      const twentyFourHoursMs = 24 * 60 * 60 * 1000;
      // expiresAt should be ~24h from now (within 1 second tolerance)
      expect(expiresAt).toBeGreaterThanOrEqual(
        before + twentyFourHoursMs - 1000
      );
      expect(expiresAt).toBeLessThanOrEqual(after + twentyFourHoursMs + 1000);
    });

    it("returns a raw token string (not the hash)", async () => {
      mockDb.values.mockResolvedValueOnce(undefined);

      const rawToken = await createEmailVerificationToken("user-1");

      expect(typeof rawToken).toBe("string");
      expect(rawToken).toHaveLength(64);
      // The returned value should NOT be the hash — it should hash to the stored value
      const insertedValues = mockDb.values.mock.calls[0][0];
      expect(rawToken).not.toBe(insertedValues.tokenHash);
      expect(hashVerificationToken(rawToken)).toBe(insertedValues.tokenHash);
    });
  });
});
