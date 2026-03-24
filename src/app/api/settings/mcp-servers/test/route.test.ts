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
});
