import { describe, it, expect, vi, beforeEach } from "vitest";

describe("getSsoConfig", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns false for both when no env vars set", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    vi.stubEnv("GITHUB_CLIENT_ID", "");
    vi.stubEnv("GITHUB_CLIENT_SECRET", "");

    // Re-import to pick up env changes
    const { getSsoConfig } = await import("./sso-config");
    const config = getSsoConfig();
    expect(config.google).toBe(false);
    expect(config.github).toBe(false);
  });

  it("returns true for google when both google env vars set", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "google-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "google-secret");
    vi.stubEnv("GITHUB_CLIENT_ID", "");
    vi.stubEnv("GITHUB_CLIENT_SECRET", "");

    const { getSsoConfig } = await import("./sso-config");
    const config = getSsoConfig();
    expect(config.google).toBe(true);
    expect(config.github).toBe(false);
  });

  it("returns true for github when both github env vars set", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    vi.stubEnv("GITHUB_CLIENT_ID", "github-id");
    vi.stubEnv("GITHUB_CLIENT_SECRET", "github-secret");

    const { getSsoConfig } = await import("./sso-config");
    const config = getSsoConfig();
    expect(config.google).toBe(false);
    expect(config.github).toBe(true);
  });

  it("returns false when only one of the pair is set", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "google-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    vi.stubEnv("GITHUB_CLIENT_ID", "");
    vi.stubEnv("GITHUB_CLIENT_SECRET", "github-secret");

    const { getSsoConfig } = await import("./sso-config");
    const config = getSsoConfig();
    expect(config.google).toBe(false);
    expect(config.github).toBe(false);
  });
});
