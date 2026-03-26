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
vi.mock("@/lib/mcp/client", () => ({
  invalidateMcpCache: vi.fn(),
}));

import { GET, POST } from "./route";
import {
  createJsonRequest,
  parseJsonResponse,
  fakeMcpServer,
} from "@/test/helpers";

describe("GET /api/settings/mcp-servers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns user MCP servers", async () => {
    mockDb.orderBy.mockResolvedValueOnce([fakeMcpServer()]);

    const { status, data } = await parseJsonResponse(await GET());

    expect(status).toBe(200);
    expect(data.servers).toHaveLength(1);
  });
});

describe("POST /api/settings/mcp-servers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a new MCP server config", async () => {
    const server = fakeMcpServer();
    mockDb.returning.mockResolvedValueOnce([server]);

    const req = createJsonRequest("http://localhost/api/settings/mcp-servers", {
      method: "POST",
      body: { name: "Test", url: "https://mcp.example.com" },
    });
    const { status, data } = await parseJsonResponse(await POST(req));

    expect(status).toBe(201);
    expect(data.name).toBe("Test MCP Server");
  });

  it("returns 400 for invalid URL", async () => {
    const req = createJsonRequest("http://localhost/api/settings/mcp-servers", {
      method: "POST",
      body: { name: "Test", url: "not-a-url" },
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
  });

  it("returns 400 for missing name", async () => {
    const req = createJsonRequest("http://localhost/api/settings/mcp-servers", {
      method: "POST",
      body: { url: "https://mcp.example.com" },
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
  });

  it("stores userId and optional apiKey in DB", async () => {
    const server = fakeMcpServer();
    mockDb.returning.mockResolvedValueOnce([server]);

    const req = createJsonRequest("http://localhost/api/settings/mcp-servers", {
      method: "POST",
      body: {
        name: "My Server",
        url: "https://mcp.example.com",
        apiKey: "sk-secret",
      },
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(201);
    expect(mockDb.values).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22",
        name: "My Server",
        url: "https://mcp.example.com",
        apiKey: "sk-secret",
      })
    );
  });
});
