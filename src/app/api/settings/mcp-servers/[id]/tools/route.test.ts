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

const { mockProbe } = vi.hoisted(() => ({
  mockProbe: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/mcp/probe", () => ({ probe: mockProbe }));
vi.mock("@/lib/mcp/oauth-provider", () => ({
  VernixOAuthProvider: vi.fn(),
}));

import { resetRateLimits } from "@/lib/rate-limit";
import { GET } from "./route";
import { parseJsonResponse, fakeMcpServer } from "@/test/helpers";

function makeRequest() {
  return new Request("http://localhost/api/settings/mcp-servers/abc/tools", {
    method: "GET",
    headers: { "x-real-ip": "1.2.3.4" },
  });
}

const makeParams = () =>
  Promise.resolve({ id: "f5ddgg44-5e6f-4ef8-bb6d-bgg4gh935f66" });

describe("GET /api/settings/mcp-servers/[id]/tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimits();
  });

  it("returns 404 when server not found", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    const { status, data } = await parseJsonResponse(
      await GET(makeRequest(), { params: makeParams() })
    );

    expect(status).toBe(404);
    expect(data.error).toBe("Server not found");
  });

  it("returns cached tools when cache is fresh", async () => {
    const server = fakeMcpServer({
      cachedTools: [{ name: "search", description: "Search things" }],
      toolsCachedAt: new Date(), // just now — fresh
      disabledTools: [],
    });
    mockDb.where.mockResolvedValueOnce([server]);

    const { status, data } = await parseJsonResponse(
      await GET(makeRequest(), { params: makeParams() })
    );

    expect(status).toBe(200);
    expect(data.tools).toHaveLength(1);
    expect(data.tools[0].name).toBe("search");
    expect(data.tools[0].enabled).toBe(true);
    // Should not have probed live
    expect(mockProbe).not.toHaveBeenCalled();
  });

  it("marks disabled tools correctly from cache", async () => {
    const server = fakeMcpServer({
      cachedTools: [
        { name: "search", description: "Search" },
        { name: "create", description: "Create" },
      ],
      toolsCachedAt: new Date(),
      disabledTools: ["create"],
    });
    mockDb.where.mockResolvedValueOnce([server]);

    const { status, data } = await parseJsonResponse(
      await GET(makeRequest(), { params: makeParams() })
    );

    expect(status).toBe(200);
    expect(data.tools).toHaveLength(2);
    expect(
      data.tools.find((t: { name: string }) => t.name === "search").enabled
    ).toBe(true);
    expect(
      data.tools.find((t: { name: string }) => t.name === "create").enabled
    ).toBe(false);
  });

  it("does a live probe when cache is stale", async () => {
    const staleDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    const server = fakeMcpServer({
      cachedTools: [{ name: "old_tool", description: "Old" }],
      toolsCachedAt: staleDate,
      disabledTools: [],
    });
    mockDb.where.mockResolvedValueOnce([server]);
    // Mock the cache update
    mockDb.catch = vi.fn();
    mockDb.catch.mockReturnValueOnce(undefined);

    mockProbe.mockResolvedValueOnce({
      toolCount: 1,
      tools: [{ name: "new_tool", description: "New" }],
    });

    const { status, data } = await parseJsonResponse(
      await GET(makeRequest(), { params: makeParams() })
    );

    expect(status).toBe(200);
    expect(data.tools[0].name).toBe("new_tool");
    expect(mockProbe).toHaveBeenCalled();
  });

  it("returns 502 when probe fails and no cache exists", async () => {
    const server = fakeMcpServer({
      cachedTools: null,
      toolsCachedAt: null,
      disabledTools: [],
    });
    mockDb.where.mockResolvedValueOnce([server]);
    mockDb.catch = vi.fn().mockReturnValueOnce(undefined);

    mockProbe.mockRejectedValueOnce(new Error("Connection refused"));

    const { status, data } = await parseJsonResponse(
      await GET(makeRequest(), { params: makeParams() })
    );

    expect(status).toBe(502);
    expect(data.error).toBe("Failed to fetch tools");
  });

  it("returns stale cache when probe fails but cache exists", async () => {
    const staleDate = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const server = fakeMcpServer({
      cachedTools: [{ name: "cached_tool", description: "Cached" }],
      toolsCachedAt: staleDate,
      disabledTools: [],
    });
    mockDb.where.mockResolvedValueOnce([server]);
    mockDb.catch = vi.fn().mockReturnValueOnce(undefined);

    mockProbe.mockRejectedValueOnce(new Error("Timeout"));

    const { status, data } = await parseJsonResponse(
      await GET(makeRequest(), { params: makeParams() })
    );

    expect(status).toBe(200);
    expect(data.tools[0].name).toBe("cached_tool");
    expect(data.stale).toBe(true);
  });

  it("returns 400 for SSRF URLs", async () => {
    const server = fakeMcpServer({
      url: "http://127.0.0.1:8080/mcp",
      cachedTools: null,
      toolsCachedAt: null,
      disabledTools: [],
    });
    mockDb.where.mockResolvedValueOnce([server]);

    const { status, data } = await parseJsonResponse(
      await GET(makeRequest(), { params: makeParams() })
    );

    expect(status).toBe(400);
    expect(data.error).toContain("private");
    expect(mockProbe).not.toHaveBeenCalled();
  });

  it("returns 429 when rate limited", async () => {
    const server = fakeMcpServer({
      cachedTools: [{ name: "t", description: "t" }],
      toolsCachedAt: new Date(),
      disabledTools: [],
    });

    // Exhaust rate limit (30 per minute)
    for (let i = 0; i < 30; i++) {
      mockDb.where.mockResolvedValueOnce([server]);
      await GET(makeRequest(), { params: makeParams() });
    }

    const { status } = await parseJsonResponse(
      await GET(makeRequest(), { params: makeParams() })
    );

    expect(status).toBe(429);
  });
});
