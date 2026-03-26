const { mockDb, mockConsume } = vi.hoisted(() => {
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
  ]) {
    db[m] = vi.fn().mockImplementation(() => db);
  }
  return { mockDb: db, mockConsume: vi.fn() };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/auth/password-reset", () => ({
  consumePasswordResetToken: mockConsume,
}));
vi.mock("bcryptjs", () => ({
  hash: vi.fn().mockResolvedValue("new-hashed-password"),
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitByIp: () => ({ success: true, remaining: 99 }),
}));

import { POST } from "./route";
import { createJsonRequest, parseJsonResponse } from "@/test/helpers";

const URL = "http://localhost/api/auth/reset-password";

describe("POST /api/auth/reset-password", () => {
  it("resets password with valid token", async () => {
    mockConsume.mockResolvedValueOnce("user-1");

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        token: "valid-token",
        email: "test@example.com",
        newPassword: "newpass123",
      },
    });
    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("returns 400 for invalid/expired token", async () => {
    mockConsume.mockResolvedValueOnce(null);

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        token: "expired-token",
        email: "test@example.com",
        newPassword: "newpass123",
      },
    });
    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
    expect(data.error).toContain("Invalid or expired");
  });

  it("returns 400 on short password", async () => {
    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        token: "token",
        email: "test@example.com",
        newPassword: "short",
      },
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
  });

  it("returns 400 on missing token", async () => {
    const req = createJsonRequest(URL, {
      method: "POST",
      body: { email: "test@example.com", newPassword: "newpass123" },
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
});
