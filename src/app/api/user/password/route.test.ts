const { mockDb, mockCompare, mockHash } = vi.hoisted(() => {
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
  return {
    mockDb: db,
    mockCompare: vi.fn(),
    mockHash: vi.fn().mockResolvedValue("new-hashed-password"),
  };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("bcryptjs", () => ({
  hash: mockHash,
  compare: mockCompare,
}));

import { PATCH } from "./route";
import { createJsonRequest, parseJsonResponse } from "@/test/helpers";

const URL = "http://localhost/api/user/password";

describe("PATCH /api/user/password", () => {
  it("changes password when current password is correct", async () => {
    // User has a password
    mockDb.where.mockResolvedValueOnce([{ passwordHash: "old-hash" }]);
    mockCompare.mockResolvedValueOnce(true);

    const req = createJsonRequest(URL, {
      method: "PATCH",
      body: { currentPassword: "oldpass123", newPassword: "newpass123" },
    });
    const { status, data } = await parseJsonResponse(await PATCH(req));
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockCompare).toHaveBeenCalledWith("oldpass123", "old-hash");
    expect(mockHash).toHaveBeenCalledWith("newpass123", 12);
    expect(mockDb.set).toHaveBeenCalledWith({
      passwordHash: "new-hashed-password",
      updatedAt: expect.any(Date),
    });
  });

  it("returns 400 when current password is incorrect", async () => {
    mockDb.where.mockResolvedValueOnce([{ passwordHash: "old-hash" }]);
    mockCompare.mockResolvedValueOnce(false);

    const req = createJsonRequest(URL, {
      method: "PATCH",
      body: { currentPassword: "wrongpass", newPassword: "newpass123" },
    });
    const { status, data } = await parseJsonResponse(await PATCH(req));
    expect(status).toBe(400);
    expect(data.error).toContain("incorrect");
  });

  it("returns 400 when current password is missing for credential user", async () => {
    mockDb.where.mockResolvedValueOnce([{ passwordHash: "old-hash" }]);

    const req = createJsonRequest(URL, {
      method: "PATCH",
      body: { newPassword: "newpass123" },
    });
    const { status, data } = await parseJsonResponse(await PATCH(req));
    expect(status).toBe(400);
    expect(data.error).toContain("Current password is required");
  });

  it("allows SSO user to set password without current password", async () => {
    // SSO user has no password
    mockDb.where.mockResolvedValueOnce([{ passwordHash: null }]);

    const req = createJsonRequest(URL, {
      method: "PATCH",
      body: { newPassword: "newpass123" },
    });
    const { status, data } = await parseJsonResponse(await PATCH(req));
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockCompare).not.toHaveBeenCalled();
  });

  it("returns 400 on short new password", async () => {
    const req = createJsonRequest(URL, {
      method: "PATCH",
      body: { currentPassword: "oldpass", newPassword: "short" },
    });
    const { status } = await parseJsonResponse(await PATCH(req));
    expect(status).toBe(400);
  });

  it("returns 404 if user not found", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    const req = createJsonRequest(URL, {
      method: "PATCH",
      body: { newPassword: "newpass123" },
    });
    const { status } = await parseJsonResponse(await PATCH(req));
    expect(status).toBe(404);
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
