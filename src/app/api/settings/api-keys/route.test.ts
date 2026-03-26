const { mockDb, mockGenerateApiKey } = vi.hoisted(() => {
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
    mockGenerateApiKey: vi.fn().mockResolvedValue({
      raw: "kk_test1234567890abcdef1234567890ab",
      hash: "$2a$10$fakehash",
      prefix: "kk_test",
    }),
  };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/auth/api-key", () => ({
  generateApiKey: mockGenerateApiKey,
}));

import { GET, POST } from "./route";
import {
  createJsonRequest,
  parseJsonResponse,
  fakeApiKey,
} from "@/test/helpers";

describe("GET /api/settings/api-keys", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns user API keys", async () => {
    const keys = [fakeApiKey()];
    mockDb.orderBy.mockResolvedValueOnce(keys);

    const { status, data } = await parseJsonResponse(await GET());

    expect(status).toBe(200);
    expect(data.keys).toHaveLength(1);
  });
});

describe("POST /api/settings/api-keys", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a new API key with hash stored and prefix returned", async () => {
    const key = fakeApiKey();
    mockDb.returning.mockResolvedValueOnce([key]);

    const req = createJsonRequest("http://localhost/api/settings/api-keys", {
      method: "POST",
      body: { name: "Claude Desktop" },
    });
    const { status, data } = await parseJsonResponse(await POST(req));

    expect(status).toBe(201);
    // The raw key is returned only once to the user
    expect(data.rawKey).toBe("kk_test1234567890abcdef1234567890ab");
    expect(data.keyPrefix).toBeDefined();
    expect(mockGenerateApiKey).toHaveBeenCalled();
    // Verify the bcrypt hash (not the raw key) is stored in the DB
    expect(mockDb.values).toHaveBeenCalledWith(
      expect.objectContaining({
        keyHash: "$2a$10$fakehash",
        keyPrefix: "kk_test",
        userId: "b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22",
        name: "Claude Desktop",
      })
    );
  });

  it("returns 400 for missing name", async () => {
    const req = createJsonRequest("http://localhost/api/settings/api-keys", {
      method: "POST",
      body: {},
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
  });
});
