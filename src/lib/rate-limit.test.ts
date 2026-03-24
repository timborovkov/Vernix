import { describe, it, expect } from "vitest";
import { rateLimit, getClientIp, resetRateLimits } from "./rate-limit";

describe("rateLimit", () => {
  it("allows requests under the limit", () => {
    const key = "test-under-" + Date.now();
    const result = rateLimit(key, { interval: 60_000, limit: 3 });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("blocks requests over the limit", () => {
    const key = "test-over-" + Date.now();
    const opts = { interval: 60_000, limit: 2 };
    rateLimit(key, opts);
    rateLimit(key, opts);
    const result = rateLimit(key, opts);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("clears all buckets on resetRateLimits", () => {
    const key = "test-clear";
    const opts = { interval: 60_000, limit: 1 };
    rateLimit(key, opts);
    expect(rateLimit(key, opts).success).toBe(false);
    resetRateLimits();
    expect(rateLimit(key, opts).success).toBe(true);
  });

  it("resets after interval expires", () => {
    const key = "test-reset-" + Date.now();
    const opts = { interval: 1, limit: 1 }; // 1ms interval
    rateLimit(key, opts);

    // Wait for interval to pass
    const start = Date.now();
    while (Date.now() - start < 2) {
      // busy wait 2ms
    }

    const result = rateLimit(key, opts);
    expect(result.success).toBe(true);
  });
});

describe("getClientIp", () => {
  it("extracts IP from x-forwarded-for", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("returns unknown when no forwarded header", () => {
    const req = new Request("http://localhost");
    expect(getClientIp(req)).toBe("unknown");
  });
});
