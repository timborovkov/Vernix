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

import { GET, DELETE } from "./route";
import { createJsonRequest, parseJsonResponse } from "@/test/helpers";

const URL = "http://localhost/api/user/accounts";

describe("GET /api/user/accounts", () => {
  it("returns linked accounts", async () => {
    mockDb.where.mockResolvedValueOnce([
      {
        id: "acc-1",
        provider: "google",
        providerAccountId: "g-123",
        createdAt: new Date("2026-01-01"),
      },
      {
        id: "acc-2",
        provider: "github",
        providerAccountId: "gh-456",
        createdAt: new Date("2026-01-02"),
      },
    ]);

    const { status, data } = await parseJsonResponse(await GET());
    expect(status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0].provider).toBe("google");
    expect(data[1].provider).toBe("github");
  });

  it("returns empty array when no accounts linked", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    const { status, data } = await parseJsonResponse(await GET());
    expect(status).toBe(200);
    expect(data).toHaveLength(0);
  });
});

describe("DELETE /api/user/accounts", () => {
  it("unlinks provider when user has password as fallback", async () => {
    // User has a password
    mockDb.where.mockResolvedValueOnce([{ passwordHash: "hashed" }]);
    // User has one linked account (the one being removed)
    mockDb.where.mockResolvedValueOnce([{ id: "acc-1", provider: "google" }]);

    const req = createJsonRequest(URL, {
      method: "DELETE",
      body: { provider: "google" },
    });
    const { status, data } = await parseJsonResponse(await DELETE(req));
    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("unlinks provider when user has another linked account", async () => {
    // User has no password (SSO only)
    mockDb.where.mockResolvedValueOnce([{ passwordHash: null }]);
    // User has two linked accounts
    mockDb.where.mockResolvedValueOnce([
      { id: "acc-1", provider: "google" },
      { id: "acc-2", provider: "github" },
    ]);

    const req = createJsonRequest(URL, {
      method: "DELETE",
      body: { provider: "google" },
    });
    const { status, data } = await parseJsonResponse(await DELETE(req));
    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("returns 400 when trying to unlink only auth method", async () => {
    // User has no password
    mockDb.where.mockResolvedValueOnce([{ passwordHash: null }]);
    // User has only the account being unlinked
    mockDb.where.mockResolvedValueOnce([{ id: "acc-1", provider: "google" }]);

    const req = createJsonRequest(URL, {
      method: "DELETE",
      body: { provider: "google" },
    });
    const { status, data } = await parseJsonResponse(await DELETE(req));
    expect(status).toBe(400);
    expect(data.error).toContain("Cannot unlink");
  });

  it("returns 400 on missing provider", async () => {
    const req = createJsonRequest(URL, {
      method: "DELETE",
      body: {},
    });
    const { status } = await parseJsonResponse(await DELETE(req));
    expect(status).toBe(400);
  });

  it("returns 400 on malformed JSON", async () => {
    const req = new Request(URL, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const { status } = await parseJsonResponse(await DELETE(req));
    expect(status).toBe(400);
  });
});
