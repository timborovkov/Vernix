import { describe, it, expect } from "vitest";
import { generateResetToken, hashResetToken } from "./password-reset";

describe("password-reset utilities", () => {
  it("generates a 64-char hex token", () => {
    const { token } = generateResetToken();
    expect(token).toHaveLength(64);
    expect(/^[a-f0-9]+$/.test(token)).toBe(true);
  });

  it("generates unique tokens each call", () => {
    const a = generateResetToken();
    const b = generateResetToken();
    expect(a.token).not.toBe(b.token);
    expect(a.tokenHash).not.toBe(b.tokenHash);
  });

  it("hashes are deterministic for same token", () => {
    const { token } = generateResetToken();
    expect(hashResetToken(token)).toBe(hashResetToken(token));
  });

  it("hash differs for different tokens", () => {
    const a = generateResetToken();
    const b = generateResetToken();
    expect(a.tokenHash).not.toBe(b.tokenHash);
  });

  it("tokenHash matches hashResetToken output", () => {
    const { token, tokenHash } = generateResetToken();
    expect(tokenHash).toBe(hashResetToken(token));
  });
});
