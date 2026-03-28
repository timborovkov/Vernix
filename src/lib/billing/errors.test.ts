import { describe, it, expect, vi } from "vitest";

vi.unmock("@/lib/billing/errors");

import { BillingApiError, isBillingError, throwIfBillingError } from "./errors";
import { detectPaywallTrigger } from "@/components/upgrade-dialog";

// ---------------------------------------------------------------------------
// BillingApiError
// ---------------------------------------------------------------------------

describe("BillingApiError", () => {
  it("sets name, message, code, and status", () => {
    const err = new BillingApiError(
      "Voice requires Pro",
      "LIMIT_EXCEEDED",
      403
    );
    expect(err.name).toBe("BillingApiError");
    expect(err.message).toBe("Voice requires Pro");
    expect(err.code).toBe("LIMIT_EXCEEDED");
    expect(err.status).toBe(403);
  });

  it("isFeatureGate is true for LIMIT_EXCEEDED", () => {
    const err = new BillingApiError("test", "LIMIT_EXCEEDED", 403);
    expect(err.isFeatureGate).toBe(true);
    expect(err.isQuotaExhausted).toBe(false);
  });

  it("isQuotaExhausted is true for RATE_LIMITED", () => {
    const err = new BillingApiError("test", "RATE_LIMITED", 429);
    expect(err.isFeatureGate).toBe(false);
    expect(err.isQuotaExhausted).toBe(true);
  });

  it("is an instance of Error", () => {
    const err = new BillingApiError("test", "LIMIT_EXCEEDED", 403);
    expect(err).toBeInstanceOf(Error);
  });
});

// ---------------------------------------------------------------------------
// isBillingError
// ---------------------------------------------------------------------------

describe("isBillingError", () => {
  it("returns true for BillingApiError instances", () => {
    expect(
      isBillingError(new BillingApiError("x", "LIMIT_EXCEEDED", 403))
    ).toBe(true);
  });

  it("returns false for regular Error", () => {
    expect(isBillingError(new Error("fail"))).toBe(false);
  });

  it("returns false for non-error values", () => {
    expect(isBillingError(null)).toBe(false);
    expect(isBillingError("string")).toBe(false);
    expect(isBillingError({ code: "LIMIT_EXCEEDED" })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// throwIfBillingError
// ---------------------------------------------------------------------------

function mockResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("throwIfBillingError", () => {
  it("throws BillingApiError for 403 with LIMIT_EXCEEDED code", async () => {
    const res = mockResponse(403, {
      error: "Voice meetings require a Pro plan",
      code: "LIMIT_EXCEEDED",
    });

    await expect(throwIfBillingError(res)).rejects.toThrow(BillingApiError);
    await expect(
      throwIfBillingError(
        mockResponse(403, {
          error: "Voice meetings require a Pro plan",
          code: "LIMIT_EXCEEDED",
        })
      )
    ).rejects.toMatchObject({
      message: "Voice meetings require a Pro plan",
      code: "LIMIT_EXCEEDED",
      status: 403,
    });
  });

  it("throws BillingApiError for 429 with RATE_LIMITED code", async () => {
    const res = mockResponse(429, {
      error: "Daily RAG query limit reached",
      code: "RATE_LIMITED",
    });

    await expect(throwIfBillingError(res)).rejects.toThrow(BillingApiError);
  });

  it("does not throw for 403 without billing code", async () => {
    const res = mockResponse(403, { error: "Forbidden" });
    await expect(throwIfBillingError(res)).resolves.toBeUndefined();
  });

  it("does not throw for 200 responses", async () => {
    const res = mockResponse(200, { data: "ok" });
    await expect(throwIfBillingError(res)).resolves.toBeUndefined();
  });

  it("does not throw for 400/500 responses", async () => {
    await expect(
      throwIfBillingError(mockResponse(400, { error: "Bad request" }))
    ).resolves.toBeUndefined();
    await expect(
      throwIfBillingError(mockResponse(500, { error: "Server error" }))
    ).resolves.toBeUndefined();
  });

  it("preserves original response body after clone (res.json() still works)", async () => {
    const res = mockResponse(403, {
      error: "Not a billing error",
      details: "some info",
    });

    // throwIfBillingError should not throw (no billing code)
    await throwIfBillingError(res);

    // Original response body should still be consumable
    const data = await res.json();
    expect(data.error).toBe("Not a billing error");
    expect(data.details).toBe("some info");
  });

  it("uses fallback message when error field is missing", async () => {
    const res = mockResponse(403, { code: "LIMIT_EXCEEDED" });

    await expect(throwIfBillingError(res)).rejects.toMatchObject({
      message: "Limit reached",
    });
  });

  it("does not throw for non-JSON 403 responses", async () => {
    const res = new Response("Forbidden", { status: 403 });
    await expect(throwIfBillingError(res)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// detectPaywallTrigger
// ---------------------------------------------------------------------------

describe("detectPaywallTrigger", () => {
  it("detects voice gate", () => {
    expect(
      detectPaywallTrigger("Voice meetings require a Pro plan", true)
    ).toBe("voice_gate");
  });

  it("detects meeting minutes exhausted", () => {
    expect(
      detectPaywallTrigger("Monthly meeting minutes exhausted", false)
    ).toBe("meeting_minutes");
  });

  it("detects monthly meeting limit", () => {
    expect(detectPaywallTrigger("Monthly meeting limit reached", false)).toBe(
      "meeting_count"
    );
  });

  it("detects concurrent meetings", () => {
    expect(detectPaywallTrigger("Maximum 1 concurrent meeting", true)).toBe(
      "concurrent_meetings"
    );
  });

  it("detects document count limit", () => {
    expect(detectPaywallTrigger("Maximum 5 documents", true)).toBe(
      "document_count"
    );
  });

  it("detects storage limit", () => {
    expect(detectPaywallTrigger("Storage limit reached", true)).toBe(
      "document_storage"
    );
  });

  it("detects upload limit", () => {
    expect(detectPaywallTrigger("Monthly upload limit reached", false)).toBe(
      "document_uploads"
    );
  });

  it("detects file size limit", () => {
    expect(detectPaywallTrigger("File exceeds 10MB limit", true)).toBe(
      "document_size"
    );
  });

  it("detects RAG query limit", () => {
    expect(detectPaywallTrigger("Daily RAG query limit reached", false)).toBe(
      "rag_queries"
    );
  });

  it("detects API access gate", () => {
    expect(detectPaywallTrigger("API access requires a Pro plan", true)).toBe(
      "api_access"
    );
  });

  it("detects API rate limit", () => {
    expect(detectPaywallTrigger("Daily API request limit reached", false)).toBe(
      "api_rate"
    );
  });

  it("falls back to generic_feature for unknown 403 messages", () => {
    expect(detectPaywallTrigger("Something unknown happened", true)).toBe(
      "generic_feature"
    );
  });

  it("falls back to generic_quota for unknown 429 messages", () => {
    expect(detectPaywallTrigger("Something unknown happened", false)).toBe(
      "generic_quota"
    );
  });
});
