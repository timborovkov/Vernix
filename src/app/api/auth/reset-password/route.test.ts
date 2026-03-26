const { mockDb } = vi.hoisted(() => {
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
    "transaction",
  ]) {
    db[m] = vi.fn().mockImplementation(() => db);
  }
  return { mockDb: db };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/auth/password-reset", () => ({
  hashResetToken: () => "hashed-token",
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
    // Transaction mock: execute the callback with a tx that behaves like db
    mockDb.transaction.mockImplementationOnce(
      async (fn: (tx: typeof mockDb) => Promise<unknown>) => {
        // DELETE ... RETURNING returns the token row
        mockDb.returning.mockResolvedValueOnce([
          { userId: "user-1", expiresAt: new Date(Date.now() + 60000) },
        ]);
        return fn(mockDb);
      }
    );

    const req = createJsonRequest(URL, {
      method: "POST",
      body: { token: "valid-token", newPassword: "newpass123" },
    });
    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("returns 400 for invalid token (not found)", async () => {
    mockDb.transaction.mockImplementationOnce(
      async (fn: (tx: typeof mockDb) => Promise<unknown>) => {
        mockDb.returning.mockResolvedValueOnce([]);
        return fn(mockDb);
      }
    );

    const req = createJsonRequest(URL, {
      method: "POST",
      body: { token: "bad-token", newPassword: "newpass123" },
    });
    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
    expect(data.error).toContain("Invalid or expired");
  });

  it("returns 400 for expired token", async () => {
    mockDb.transaction.mockImplementationOnce(
      async (fn: (tx: typeof mockDb) => Promise<unknown>) => {
        mockDb.returning.mockResolvedValueOnce([
          { userId: "user-1", expiresAt: new Date(Date.now() - 60000) },
        ]);
        return fn(mockDb);
      }
    );

    const req = createJsonRequest(URL, {
      method: "POST",
      body: { token: "expired-token", newPassword: "newpass123" },
    });
    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
    expect(data.error).toContain("Invalid or expired");
  });

  it("returns 400 on short password", async () => {
    const req = createJsonRequest(URL, {
      method: "POST",
      body: { token: "token", newPassword: "short" },
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
  });

  it("returns 400 on missing token", async () => {
    const req = createJsonRequest(URL, {
      method: "POST",
      body: { newPassword: "newpass123" },
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
