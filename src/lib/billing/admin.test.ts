import { describe, expect, it } from "vitest";

import { isAdminUserEmail, parseAdminEmailAllowlist } from "./admin";

describe("admin billing allowlist", () => {
  it("returns an empty allowlist when env is missing", () => {
    expect(parseAdminEmailAllowlist()).toEqual(new Set());
    expect(isAdminUserEmail("tim@example.com", null)).toBe(false);
  });

  it("matches comma-separated emails", () => {
    expect(
      isAdminUserEmail(
        "founder@example.com",
        "tim@example.com,founder@example.com"
      )
    ).toBe(true);
  });

  it("ignores whitespace and case", () => {
    expect(
      isAdminUserEmail(
        "TIM@example.com",
        " founder@example.com, tim@EXAMPLE.com "
      )
    ).toBe(true);
  });

  it("does not match emails outside the allowlist", () => {
    expect(
      isAdminUserEmail(
        "person@example.com",
        "tim@example.com,founder@example.com"
      )
    ).toBe(false);
  });
});
