import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  getFreePlanUpgradeReminderHtml,
  getLastChanceRetentionHtml,
  getWelcomeEmailHtml,
  getContactNotificationHtml,
} from "./templates";

describe("escapeHtml", () => {
  it("escapes ampersands", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("escapes angle brackets", () => {
    expect(escapeHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert('xss')&lt;/script&gt;"
    );
  });

  it("escapes quotes", () => {
    expect(escapeHtml('"hello"')).toBe("&quot;hello&quot;");
  });

  it("returns empty string unchanged", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("preserves plain text", () => {
    expect(escapeHtml("Hello world")).toBe("Hello world");
  });
});

describe("getWelcomeEmailHtml", () => {
  it("returns HTML containing the user name", () => {
    const html = getWelcomeEmailHtml("Alice");
    expect(html).toContain("Hi Alice");
    expect(html).toContain("Welcome to Vernix");
    expect(html).toContain("Start Your First Meeting");
    expect(html).toContain("Start a free Pro trial");
  });

  it("escapes HTML in user name", () => {
    const html = getWelcomeEmailHtml('<script>alert("xss")</script>');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("getContactNotificationHtml", () => {
  it("returns HTML containing all fields", () => {
    const html = getContactNotificationHtml({
      topic: "Bug report",
      email: "user@example.com",
      name: "Test User",
      company: "Acme Inc",
      message: "Something is broken",
    });
    expect(html).toContain("Bug report");
    expect(html).toContain("user@example.com");
    expect(html).toContain("Test User");
    expect(html).toContain("Acme Inc");
    expect(html).toContain("Something is broken");
  });

  it("escapes HTML in message", () => {
    const html = getContactNotificationHtml({
      topic: "Question",
      email: "a@b.com",
      message: '<img src=x onerror="alert(1)">',
    });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("omits company row when not provided", () => {
    const html = getContactNotificationHtml({
      topic: "Feature",
      email: "a@b.com",
      message: "Hello",
    });
    expect(html).not.toContain("Company");
  });
});

describe("getFreePlanUpgradeReminderHtml", () => {
  it("includes upgrade CTA and escaped name", () => {
    const html = getFreePlanUpgradeReminderHtml(
      '<script>alert("xss")</script>'
    );
    expect(html).toContain("Want Vernix to do more in your calls?");
    expect(html).toContain("Upgrade to Pro");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });
});

describe("getLastChanceRetentionHtml", () => {
  it("includes period end date when provided", () => {
    const html = getLastChanceRetentionHtml("Alice", new Date("2026-05-01"));
    expect(html).toContain("Last chance to keep your Pro benefits");
    expect(html).toContain("Alice");
    expect(html).toContain("2026");
  });

  it("falls back to generic period copy without date", () => {
    const html = getLastChanceRetentionHtml("Alice");
    expect(html).toContain("current period ends");
  });
});
