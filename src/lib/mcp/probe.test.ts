const { mockConnectMcpClient } = vi.hoisted(() => ({
  mockConnectMcpClient: vi.fn(),
}));

vi.mock("./transport", () => ({
  connectMcpClient: mockConnectMcpClient,
}));

import { probe } from "./probe";

describe("probe", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns tool list on success", async () => {
    const mockClient = {
      listTools: vi.fn().mockResolvedValue({
        tools: [
          { name: "search", description: "Search docs" },
          { name: "create", description: "Create item" },
        ],
      }),
      close: vi.fn().mockResolvedValue(undefined),
    };
    mockConnectMcpClient.mockResolvedValueOnce(mockClient);

    const result = await probe("https://mcp.example.com", {});

    expect(result.toolCount).toBe(2);
    expect(result.tools).toEqual([
      { name: "search", description: "Search docs" },
      { name: "create", description: "Create item" },
    ]);
    expect(mockClient.close).toHaveBeenCalled();
  });

  it("returns empty tools when server has none", async () => {
    const mockClient = {
      listTools: vi.fn().mockResolvedValue({ tools: [] }),
      close: vi.fn().mockResolvedValue(undefined),
    };
    mockConnectMcpClient.mockResolvedValueOnce(mockClient);

    const result = await probe("https://mcp.example.com", {});

    expect(result.toolCount).toBe(0);
    expect(result.tools).toEqual([]);
  });

  it("handles null description gracefully", async () => {
    const mockClient = {
      listTools: vi.fn().mockResolvedValue({
        tools: [{ name: "tool_no_desc", description: null }],
      }),
      close: vi.fn().mockResolvedValue(undefined),
    };
    mockConnectMcpClient.mockResolvedValueOnce(mockClient);

    const result = await probe("https://mcp.example.com", {});

    expect(result.tools[0].description).toBe("");
  });

  it("closes client even when listTools fails", async () => {
    const mockClient = {
      listTools: vi.fn().mockRejectedValue(new Error("Server error")),
      close: vi.fn().mockResolvedValue(undefined),
    };
    mockConnectMcpClient.mockResolvedValueOnce(mockClient);

    await expect(probe("https://mcp.example.com", {})).rejects.toThrow(
      "Server error"
    );
    expect(mockClient.close).toHaveBeenCalled();
  });

  it("passes headers and authProvider to connectMcpClient", async () => {
    const mockClient = {
      listTools: vi.fn().mockResolvedValue({ tools: [] }),
      close: vi.fn().mockResolvedValue(undefined),
    };
    mockConnectMcpClient.mockResolvedValueOnce(mockClient);

    const headers = { Authorization: "Bearer sk-test" };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const authProvider = {} as any;

    await probe("https://mcp.example.com", headers, authProvider);

    expect(mockConnectMcpClient).toHaveBeenCalledWith(
      "https://mcp.example.com",
      headers,
      authProvider
    );
  });
});
