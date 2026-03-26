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

import { GET, PATCH } from "./route";
import { createJsonRequest, parseJsonResponse } from "@/test/helpers";

const URL = "http://localhost/api/user/profile";

describe("GET /api/user/profile", () => {
  it("returns profile with linked accounts", async () => {
    // First select: user
    mockDb.where.mockResolvedValueOnce([
      {
        id: "b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22",
        name: "Test User",
        email: "test@example.com",
        image: null,
        hasPassword: "hashed",
      },
    ]);
    // Second select: accounts
    mockDb.where.mockResolvedValueOnce([
      {
        provider: "google",
        providerAccountId: "123",
        createdAt: new Date("2026-01-01"),
      },
    ]);

    const { status, data } = await parseJsonResponse(await GET());
    expect(status).toBe(200);
    expect(data.name).toBe("Test User");
    expect(data.email).toBe("test@example.com");
    expect(data.hasPassword).toBe(true);
    expect(data.accounts).toHaveLength(1);
    expect(data.accounts[0].provider).toBe("google");
  });

  it("returns 404 if user not found", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    const { status } = await parseJsonResponse(await GET());
    expect(status).toBe(404);
  });
});

describe("PATCH /api/user/profile", () => {
  it("updates name successfully", async () => {
    mockDb.returning.mockResolvedValueOnce([
      { id: "user-1", name: "New Name", email: "test@example.com" },
    ]);

    const req = createJsonRequest(URL, {
      method: "PATCH",
      body: { name: "New Name" },
    });
    const { status, data } = await parseJsonResponse(await PATCH(req));
    expect(status).toBe(200);
    expect(data.name).toBe("New Name");
  });

  it("returns 400 on empty name", async () => {
    const req = createJsonRequest(URL, {
      method: "PATCH",
      body: { name: "" },
    });
    const { status } = await parseJsonResponse(await PATCH(req));
    expect(status).toBe(400);
  });

  it("returns 400 on missing name", async () => {
    const req = createJsonRequest(URL, {
      method: "PATCH",
      body: {},
    });
    const { status } = await parseJsonResponse(await PATCH(req));
    expect(status).toBe(400);
  });

  it("returns 400 on malformed JSON", async () => {
    const req = new Request(URL, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const { status } = await parseJsonResponse(await PATCH(req));
    expect(status).toBe(400);
  });
});
