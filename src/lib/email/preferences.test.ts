import { describe, it, expect, beforeEach } from "vitest";
import {
  shouldSendEmail,
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
  buildUnsubscribeUrl,
} from "./preferences";

describe("email preferences", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "test-secret";
    process.env.NEXT_PUBLIC_APP_URL = "https://test.vernix.app";
  });

  describe("shouldSendEmail", () => {
    it("returns true for transactional regardless of preferences", () => {
      expect(
        shouldSendEmail({ marketing: false, product: false }, "transactional")
      ).toBe(true);
    });

    it("returns true for transactional when preferences are null", () => {
      expect(shouldSendEmail(null, "transactional")).toBe(true);
    });

    it("returns true for transactional when preferences are undefined", () => {
      expect(shouldSendEmail(undefined, "transactional")).toBe(true);
    });

    it("returns true when preferences are null (default opted in)", () => {
      expect(shouldSendEmail(null, "marketing")).toBe(true);
      expect(shouldSendEmail(null, "product")).toBe(true);
    });

    it("returns true when preferences are undefined (default opted in)", () => {
      expect(shouldSendEmail(undefined, "marketing")).toBe(true);
      expect(shouldSendEmail(undefined, "product")).toBe(true);
    });

    it("returns true when preferences are empty object (default opted in)", () => {
      expect(shouldSendEmail({}, "marketing")).toBe(true);
      expect(shouldSendEmail({}, "product")).toBe(true);
    });

    it("returns false when marketing is explicitly false", () => {
      expect(shouldSendEmail({ marketing: false }, "marketing")).toBe(false);
    });

    it("returns false when product is explicitly false", () => {
      expect(shouldSendEmail({ product: false }, "product")).toBe(false);
    });

    it("returns true when other category is false but this one is not", () => {
      expect(shouldSendEmail({ marketing: false }, "product")).toBe(true);
      expect(shouldSendEmail({ product: false }, "marketing")).toBe(true);
    });
  });

  describe("generateUnsubscribeToken", () => {
    it("produces consistent output for same input", () => {
      const a = generateUnsubscribeToken("user-1", "marketing");
      const b = generateUnsubscribeToken("user-1", "marketing");
      expect(a).toBe(b);
    });

    it("produces different output for different userId", () => {
      const a = generateUnsubscribeToken("user-1", "marketing");
      const b = generateUnsubscribeToken("user-2", "marketing");
      expect(a).not.toBe(b);
    });

    it("produces different output for different category", () => {
      const a = generateUnsubscribeToken("user-1", "marketing");
      const b = generateUnsubscribeToken("user-1", "product");
      expect(a).not.toBe(b);
    });

    it("returns a hex string", () => {
      const token = generateUnsubscribeToken("user-1", "marketing");
      expect(/^[a-f0-9]+$/.test(token)).toBe(true);
    });
  });

  describe("verifyUnsubscribeToken", () => {
    it("returns true for valid token", () => {
      const token = generateUnsubscribeToken("user-1", "marketing");
      expect(verifyUnsubscribeToken(token, "user-1", "marketing")).toBe(true);
    });

    it("returns false for tampered token", () => {
      const token = generateUnsubscribeToken("user-1", "marketing");
      expect(
        verifyUnsubscribeToken(token + "tampered", "user-1", "marketing")
      ).toBe(false);
    });

    it("returns false for wrong userId", () => {
      const token = generateUnsubscribeToken("user-1", "marketing");
      expect(verifyUnsubscribeToken(token, "user-2", "marketing")).toBe(false);
    });

    it("returns false for wrong category", () => {
      const token = generateUnsubscribeToken("user-1", "marketing");
      expect(verifyUnsubscribeToken(token, "user-1", "product")).toBe(false);
    });

    it("returns false for empty token", () => {
      expect(verifyUnsubscribeToken("", "user-1", "marketing")).toBe(false);
    });
  });

  describe("buildUnsubscribeUrl", () => {
    it("contains all required params", () => {
      const url = buildUnsubscribeUrl("user-123", "marketing");
      expect(url).toContain("https://test.vernix.app/api/email/unsubscribe");
      expect(url).toContain("userId=user-123");
      expect(url).toContain("category=marketing");
      expect(url).toContain("token=");
    });

    it("generates a URL with a valid token", () => {
      const url = buildUnsubscribeUrl("user-123", "product");
      const parsed = new URL(url);
      const token = parsed.searchParams.get("token")!;
      const userId = parsed.searchParams.get("userId")!;
      const category = parsed.searchParams.get("category")!;
      expect(verifyUnsubscribeToken(token, userId, category)).toBe(true);
    });

    it("uses default app URL when env var is not set", () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      const url = buildUnsubscribeUrl("user-123", "marketing");
      expect(url).toContain("https://vernix.app/api/email/unsubscribe");
    });
  });
});
