import { describe, it, expect } from "vitest";
import { formatDateTime, formatDate, formatRelativeTime } from "./date";

describe("formatDateTime", () => {
  it("formats a date string with timezone", () => {
    const result = formatDateTime("2026-01-05T15:42:00Z", "UTC");
    expect(result).toContain("Jan");
    expect(result).toContain("5");
    expect(result).toContain("2026");
  });

  it("formats a Date object", () => {
    const result = formatDateTime(new Date("2026-06-15T10:30:00Z"), "UTC");
    expect(result).toContain("Jun");
    expect(result).toContain("15");
  });

  it("falls back gracefully with null timezone", () => {
    const result = formatDateTime("2026-01-05T15:42:00Z", null);
    expect(result).toContain("2026");
  });

  it("falls back to no-timezone on invalid timezone", () => {
    // Should not throw, should fall back
    const result = formatDateTime("2026-01-05T15:42:00Z", "Not/A/Zone");
    expect(result).toContain("2026");
  });
});

describe("formatDate", () => {
  it("formats date-only", () => {
    const result = formatDate("2026-03-20T00:00:00Z", "UTC");
    expect(result).toContain("Mar");
    expect(result).toContain("20");
    expect(result).toContain("2026");
  });

  it("handles null timezone", () => {
    const result = formatDate("2026-03-20T00:00:00Z", null);
    expect(result).toContain("2026");
  });
});

describe("formatRelativeTime", () => {
  it("returns 'just now' for recent dates", () => {
    const now = new Date();
    expect(formatRelativeTime(now)).toBe("just now");
  });

  it("returns minutes ago", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatRelativeTime(fiveMinAgo)).toBe("5m ago");
  });

  it("returns hours ago", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(formatRelativeTime(threeHoursAgo)).toBe("3h ago");
  });

  it("returns days ago", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(twoDaysAgo)).toBe("2d ago");
  });

  it("returns formatted date for 7+ days", () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const result = formatRelativeTime(tenDaysAgo);
    // Should be a formatted date string, not relative
    expect(result).not.toContain("ago");
    expect(result).toContain("202");
  });

  it("handles future dates gracefully", () => {
    const future = new Date(Date.now() + 60 * 1000);
    // Negative diff falls through to "just now" — not crashing is the key
    expect(formatRelativeTime(future)).toBe("just now");
  });

  it("accepts string input", () => {
    const result = formatRelativeTime(new Date().toISOString());
    expect(result).toBe("just now");
  });
});
