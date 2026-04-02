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

import { PATCH, DELETE } from "./route";
import {
  createJsonRequest,
  parseJsonResponse,
  fakeMcpServer,
} from "@/test/helpers";

const makeParams = () =>
  Promise.resolve({ id: "f5ddgg44-5e6f-4ef8-bb6d-bgg4gh935f66" });

describe("PATCH /api/settings/mcp-servers/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates disabledTools with valid string array", async () => {
    const server = fakeMcpServer({ disabledTools: ["search", "create"] });
    mockDb.returning.mockResolvedValueOnce([server]);

    const req = createJsonRequest(
      "http://localhost/api/settings/mcp-servers/abc",
      {
        method: "PATCH",
        body: { disabledTools: ["search", "create"] },
      }
    );

    const { status } = await parseJsonResponse(
      await PATCH(req, { params: makeParams() })
    );

    expect(status).toBe(200);
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({
        disabledTools: ["search", "create"],
      })
    );
  });

  it("deduplicates disabledTools entries", async () => {
    const server = fakeMcpServer({ disabledTools: ["search"] });
    mockDb.returning.mockResolvedValueOnce([server]);

    const req = createJsonRequest(
      "http://localhost/api/settings/mcp-servers/abc",
      {
        method: "PATCH",
        body: { disabledTools: ["search", "search", "search"] },
      }
    );

    const { status } = await parseJsonResponse(
      await PATCH(req, { params: makeParams() })
    );

    expect(status).toBe(200);
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({
        disabledTools: ["search"],
      })
    );
  });

  it("returns 400 for disabledTools with non-string elements", async () => {
    const req = createJsonRequest(
      "http://localhost/api/settings/mcp-servers/abc",
      {
        method: "PATCH",
        body: { disabledTools: ["valid", 123, null] },
      }
    );

    const { status, data } = await parseJsonResponse(
      await PATCH(req, { params: makeParams() })
    );

    expect(status).toBe(400);
    expect(data.error).toContain("Invalid disabledTools");
  });

  it("returns 400 for disabledTools with empty strings", async () => {
    const req = createJsonRequest(
      "http://localhost/api/settings/mcp-servers/abc",
      {
        method: "PATCH",
        body: { disabledTools: ["valid", ""] },
      }
    );

    const { status, data } = await parseJsonResponse(
      await PATCH(req, { params: makeParams() })
    );

    expect(status).toBe(400);
    expect(data.error).toContain("Invalid disabledTools");
  });

  it("returns 400 for disabledTools exceeding max array length", async () => {
    const hugeArray = Array.from({ length: 501 }, (_, i) => `tool_${i}`);
    const req = createJsonRequest(
      "http://localhost/api/settings/mcp-servers/abc",
      {
        method: "PATCH",
        body: { disabledTools: hugeArray },
      }
    );

    const { status, data } = await parseJsonResponse(
      await PATCH(req, { params: makeParams() })
    );

    expect(status).toBe(400);
    expect(data.error).toContain("Invalid disabledTools");
  });

  it("returns 400 for disabledTools with strings exceeding max length", async () => {
    const longString = "a".repeat(201);
    const req = createJsonRequest(
      "http://localhost/api/settings/mcp-servers/abc",
      {
        method: "PATCH",
        body: { disabledTools: [longString] },
      }
    );

    const { status, data } = await parseJsonResponse(
      await PATCH(req, { params: makeParams() })
    );

    expect(status).toBe(400);
    expect(data.error).toContain("Invalid disabledTools");
  });

  it("returns 404 when server not found", async () => {
    mockDb.returning.mockResolvedValueOnce([]);

    const req = createJsonRequest(
      "http://localhost/api/settings/mcp-servers/abc",
      {
        method: "PATCH",
        body: { name: "New Name" },
      }
    );

    const { status, data } = await parseJsonResponse(
      await PATCH(req, { params: makeParams() })
    );

    expect(status).toBe(404);
    expect(data.error).toBe("MCP server not found");
  });
});

describe("DELETE /api/settings/mcp-servers/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes the server", async () => {
    mockDb.returning.mockResolvedValueOnce([fakeMcpServer()]);

    const req = new Request("http://localhost/api/settings/mcp-servers/abc", {
      method: "DELETE",
    });

    const { status, data } = await parseJsonResponse(
      await DELETE(req, { params: makeParams() })
    );

    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("returns 404 when server not found", async () => {
    mockDb.returning.mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/settings/mcp-servers/abc", {
      method: "DELETE",
    });

    const { status } = await parseJsonResponse(
      await DELETE(req, { params: makeParams() })
    );

    expect(status).toBe(404);
  });
});
