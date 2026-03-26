const { mockFindUser, mockCreateToken, mockSendEmail } = vi.hoisted(() => ({
  mockFindUser: vi.fn(),
  mockCreateToken: vi.fn(),
  mockSendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/auth/password-reset", () => ({
  findUserByEmail: mockFindUser,
  createPasswordResetToken: mockCreateToken,
}));
vi.mock("@/lib/email/send", () => ({ sendEmail: mockSendEmail }));
vi.mock("@/lib/email/templates", () => ({
  getPasswordResetEmailHtml: () => "<p>Reset</p>",
}));
// Mock next/server's after() to execute the callback immediately in tests
vi.mock("next/server", async (importOriginal) => {
  const original = await importOriginal<typeof import("next/server")>();
  return {
    ...original,
    after: (fn: () => Promise<void>) => fn(),
  };
});

import { POST } from "./route";
import { createJsonRequest, parseJsonResponse } from "@/test/helpers";
import { resetRateLimits } from "@/lib/rate-limit";

const URL = "http://localhost/api/auth/forgot-password";

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it("sends reset email for existing user", async () => {
    mockFindUser.mockResolvedValueOnce({
      id: "user-1",
      name: "Test",
      email: "test@example.com",
    });
    mockCreateToken.mockResolvedValueOnce("reset-token-123");

    const req = createJsonRequest(URL, {
      method: "POST",
      body: { email: "test@example.com" },
    });
    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockCreateToken).toHaveBeenCalledWith("user-1");
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "test@example.com",
        subject: "Reset your Vernix password",
        html: expect.any(String),
      })
    );
  });

  it("returns success even for nonexistent email (no enumeration)", async () => {
    mockFindUser.mockResolvedValueOnce(null);

    const req = createJsonRequest(URL, {
      method: "POST",
      body: { email: "nobody@example.com" },
    });
    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid email format", async () => {
    const req = createJsonRequest(URL, {
      method: "POST",
      body: { email: "not-email" },
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
  });

  it("returns 400 on malformed JSON", async () => {
    const req = new Request(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
  });

  it("returns 429 after exceeding rate limit", async () => {
    for (let i = 0; i < 3; i++) {
      const req = createJsonRequest(URL, {
        method: "POST",
        body: { email: "test@example.com" },
      });
      const { status } = await parseJsonResponse(await POST(req));
      expect(status).toBe(200);
    }

    const req = createJsonRequest(URL, {
      method: "POST",
      body: { email: "test@example.com" },
    });
    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(429);
    expect(data.error).toContain("Too many requests");
  });
});
