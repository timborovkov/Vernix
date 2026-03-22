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
  ]) {
    db[m] = vi.fn().mockImplementation(() => db);
  }
  return { mockDb: db };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("bcryptjs", () => ({
  hash: vi.fn().mockResolvedValue("hashed-password"),
}));

import { POST } from "./route";
import { createJsonRequest, parseJsonResponse } from "@/test/helpers";

const URL = "http://localhost/api/auth/register";

describe("POST /api/auth/register", () => {
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

  it("returns 400 on short password", async () => {
    const req = createJsonRequest(URL, {
      method: "POST",
      body: { email: "test@example.com", password: "123", name: "Test" },
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
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
  });

  it("returns 400 on duplicate email (unique constraint)", async () => {
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
    expect(status).toBe(400);

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
});
