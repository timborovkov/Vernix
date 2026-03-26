const { mockDb, mockConnectForUser, mockCallTool } = vi.hoisted(() => {
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
  const callTool = vi.fn().mockResolvedValue({ content: "result" });
  const connectForUser = vi.fn().mockResolvedValue({ callTool });
  return {
    mockDb: db,
    mockConnectForUser: connectForUser,
    mockCallTool: callTool,
  };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/mcp/client", () => ({
  McpClientManager: { connectForUser: mockConnectForUser },
}));

import { POST } from "./route";
import { createJsonRequest, parseJsonResponse } from "@/test/helpers";

const URL = "http://localhost/api/agent/mcp-tool";

describe("POST /api/agent/mcp-tool", () => {
  beforeEach(() => {
    mockDb.where.mockReset();
    mockConnectForUser
      .mockReset()
      .mockResolvedValue({ callTool: mockCallTool });
    mockCallTool.mockReset().mockResolvedValue({ content: "result" });
  });

  it("returns 400 on missing fields", async () => {
    const req = createJsonRequest(URL, {
      method: "POST",
      body: { toolName: "test" },
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
  });

  it("returns result for unknown meeting", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        botSecret: "secret-123",
        toolName: "mcp__abc__lookup",
      },
    });
    const { data } = await parseJsonResponse(await POST(req));
    expect(data.result).toBe("Meeting not found.");
  });

  it("returns 403 on invalid botSecret", async () => {
    mockDb.where.mockResolvedValueOnce([
      { userId: "user-1", metadata: { voiceSecret: "correct-secret" } },
    ]);

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        botSecret: "wrong-secret",
        toolName: "mcp__abc__lookup",
      },
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(403);
  });

  it("returns tool result on valid request", async () => {
    mockDb.where.mockResolvedValueOnce([
      { userId: "user-1", metadata: { voiceSecret: "valid-secret" } },
    ]);
    mockCallTool.mockResolvedValueOnce({ content: "Customer: Alice" });

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        botSecret: "valid-secret",
        toolName: "mcp__abc__lookup",
        arguments: { id: "123" },
      },
    });
    const { status, data } = await parseJsonResponse(await POST(req));

    expect(status).toBe(200);
    expect(data.result).toEqual({ content: "Customer: Alice" });
    expect(mockCallTool).toHaveBeenCalledWith("mcp__abc__lookup", {
      id: "123",
    });
  });

  it("connects MCP manager with the meeting owner userId", async () => {
    mockDb.where.mockResolvedValueOnce([
      { userId: "owner-42", metadata: { voiceSecret: "valid-secret" } },
    ]);

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        botSecret: "valid-secret",
        toolName: "mcp__abc__lookup",
        arguments: { query: "test" },
      },
    });
    await POST(req);

    expect(mockConnectForUser).toHaveBeenCalledWith("owner-42");
    expect(mockCallTool).toHaveBeenCalledWith("mcp__abc__lookup", {
      query: "test",
    });
  });

  it("returns graceful error when MCP call fails", async () => {
    mockDb.where.mockResolvedValueOnce([
      { userId: "user-1", metadata: { voiceSecret: "valid-secret" } },
    ]);
    mockCallTool.mockRejectedValueOnce(new Error("Server down"));

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        botSecret: "valid-secret",
        toolName: "mcp__abc__lookup",
      },
    });
    const { status, data } = await parseJsonResponse(await POST(req));

    expect(status).toBe(200);
    expect(data.result).toContain("unavailable");
  });
});
