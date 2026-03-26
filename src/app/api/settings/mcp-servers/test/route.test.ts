const { mockConnectMcpClient } = vi.hoisted(() => ({
  mockConnectMcpClient: vi.fn(),
}));

vi.mock("@/lib/mcp/transport", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/mcp/transport")>();
  return { ...actual, connectMcpClient: mockConnectMcpClient };
});

import { POST } from "./route";
import { createJsonRequest, parseJsonResponse } from "@/test/helpers";

describe("POST /api/settings/mcp-servers/test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects IPv6 unspecified host (::) to prevent SSRF", async () => {
    const req = createJsonRequest(
      "http://localhost/api/settings/mcp-servers/test",
      {
        method: "POST",
        body: {
          url: "http://[::]:80/mcp",
        },
      }
    );

    const { status, data } = await parseJsonResponse(await POST(req));

    expect(status).toBe(400);
    expect(data).toMatchObject({
      success: false,
      error: "URL resolves to a private or restricted address",
    });
    expect(mockConnectMcpClient).not.toHaveBeenCalled();
  });

  it("rejects localhost URLs to prevent SSRF", async () => {
    const req = createJsonRequest(
      "http://localhost/api/settings/mcp-servers/test",
      {
        method: "POST",
        body: { url: "http://127.0.0.1:8080/mcp" },
      }
    );

    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
    expect(data.success).toBe(false);
    expect(mockConnectMcpClient).not.toHaveBeenCalled();
  });

  it("returns tool count on successful connection", async () => {
    const mockClient = {
      listTools: vi.fn().mockResolvedValue({
        tools: [{ name: "search", description: "Search docs" }],
      }),
      close: vi.fn().mockResolvedValue(undefined),
    };
    mockConnectMcpClient.mockResolvedValueOnce(mockClient);

    const req = createJsonRequest(
      "http://localhost/api/settings/mcp-servers/test",
      {
        method: "POST",
        body: { url: "https://mcp.example.com" },
      }
    );

    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.toolCount).toBe(1);
    expect(data.tools[0].name).toBe("search");
    expect(mockClient.close).toHaveBeenCalled();
  });

  it("returns 400 for invalid request body", async () => {
    const req = createJsonRequest(
      "http://localhost/api/settings/mcp-servers/test",
      {
        method: "POST",
        body: { invalid: true },
      }
    );

    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
  });
});
