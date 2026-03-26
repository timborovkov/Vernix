const { mockDb, mockHash } = vi.hoisted(() => {
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
  const mockHash = vi.fn().mockResolvedValue("hashed-password");
  return { mockDb: db, mockHash };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("bcryptjs", () => ({
  hash: mockHash,
}));
vi.mock("@/lib/email/send", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@/lib/email/templates", () => ({
  getWelcomeEmailHtml: () => "<p>Welcome</p>",
}));

import { POST } from "./route";
import { hash } from "bcryptjs";
import { sendEmail } from "@/lib/email/send";
import { resetRateLimits } from "@/lib/rate-limit";
import { createJsonRequest, parseJsonResponse } from "@/test/helpers";

const URL = "http://localhost/api/auth/register";

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    resetRateLimits();
    vi.clearAllMocks();
  });

  it("returns 400 on missing fields", async () => {
    const req = createJsonRequest(URL, {
      method: "POST",
      body: { email: "test@example.com" },
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
  });

  it("returns 400 on invalid email", async () => {
    const req = createJsonRequest(URL, {
      method: "POST",
      body: { email: "not-email", password: "12345678", name: "Test" },
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
  });

  it("returns 400 on short password with descriptive error", async () => {
    const req = createJsonRequest(URL, {
      method: "POST",
      body: { email: "test@example.com", password: "123", name: "Test" },
    });
    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
    expect(data.issues).toBeDefined();
    const messages = data.issues.map((i: { message: string }) => i.message);
    expect(messages).toEqual(
      expect.arrayContaining([expect.stringMatching(/password/i)])
    );
  });

  it("registers user successfully", async () => {
    mockDb.returning.mockResolvedValueOnce([
      { id: "user-1", email: "new@example.com", name: "New User" },
    ]);

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        email: "new@example.com",
        password: "password123",
        name: "New User",
      },
    });
    const { status, data } = await parseJsonResponse(await POST(req));

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.user.email).toBe("new@example.com");

    // bcrypt hash was called with the actual password and cost factor 12
    expect(hash).toHaveBeenCalledWith("password123", 12);

    // The hashed password was passed to the DB insert
    expect(mockDb.values).toHaveBeenCalledWith(
      expect.objectContaining({ passwordHash: "hashed-password" })
    );

    // Welcome email should be sent with HTML body
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "new@example.com",
        subject: "Welcome to Vernix",
        html: expect.stringContaining("<p>Welcome</p>"),
      })
    );
  });

  it("returns 409 on duplicate email (unique constraint)", async () => {
    // Override the values mock to return an object whose returning() rejects
    const origValues = mockDb.values.getMockImplementation();
    // Postgres unique constraint errors have code "23505"
    const pgError = Object.assign(new Error("unique constraint violation"), {
      code: "23505",
    });
    mockDb.values.mockImplementationOnce(() => ({
      returning: () => Promise.reject(pgError),
    }));

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        email: "existing@example.com",
        password: "password123",
        name: "Dupe",
      },
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(409);

    // Restore
    if (origValues) mockDb.values.mockImplementation(origValues);
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

  it("returns 429 after exceeding rate limit (5 requests)", async () => {
    mockDb.returning.mockResolvedValue([
      { id: "user-1", email: "rl@example.com", name: "RL User" },
    ]);

    const makeReq = () =>
      new Request(URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-real-ip": "10.0.0.99",
        },
        body: JSON.stringify({
          email: "rl@example.com",
          password: "password123",
          name: "RL User",
        }),
      });

    // First 5 requests should succeed
    for (let i = 0; i < 5; i++) {
      const { status } = await parseJsonResponse(await POST(makeReq()));
      expect(status).toBe(200);
    }

    // 6th request should be rate limited
    const { status, data } = await parseJsonResponse(await POST(makeReq()));
    expect(status).toBe(429);
    expect(data.error).toMatch(/too many/i);
  });
});
