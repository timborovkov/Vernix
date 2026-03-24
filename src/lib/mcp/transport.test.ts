const {
  MockStreamableHTTPError,
  createdClients,
  connectBehavior,
  mockSseFetch,
} = vi.hoisted(() => {
  class MockStreamableHTTPError extends Error {
    code: number;
    constructor(code: number) {
      super(`streamable error ${code}`);
      this.code = code;
    }
  }

  const createdClients: Array<{
    connect: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  }> = [];

  const connectBehavior = vi.fn<(transport: unknown) => Promise<void>>();
  const mockSseFetch =
    vi.fn<(u: string | URL, init?: RequestInit) => Promise<Response>>();

  return {
    MockStreamableHTTPError,
    createdClients,
    connectBehavior,
    mockSseFetch,
  };
});

vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: class MockClient {
    connect = vi.fn(async (transport: unknown) => connectBehavior(transport));
    close = vi.fn(async () => {});

    constructor() {
      createdClients.push({ connect: this.connect, close: this.close });
    }
  },
}));

vi.mock("@modelcontextprotocol/sdk/client/streamableHttp.js", () => ({
  StreamableHTTPClientTransport: class MockStreamableHTTPClientTransport {
    url: URL;
    options: unknown;
    constructor(url: URL, options: unknown) {
      this.url = url;
      this.options = options;
    }
  },
  StreamableHTTPError: MockStreamableHTTPError,
}));

vi.mock("@modelcontextprotocol/sdk/client/sse.js", () => ({
  SSEClientTransport: class MockSSEClientTransport {
    url: URL;
    options: {
      requestInit?: RequestInit;
      eventSourceInit?: {
        fetch?: (u: string | URL, init?: RequestInit) => Promise<Response>;
      };
    };

    constructor(
      url: URL,
      options: {
        requestInit?: RequestInit;
        eventSourceInit?: {
          fetch?: (u: string | URL, init?: RequestInit) => Promise<Response>;
        };
      }
    ) {
      this.url = url;
      this.options = options;
      const fetchImpl = options.eventSourceInit?.fetch;
      if (fetchImpl) {
        mockSseFetch.mockImplementation(fetchImpl);
      }
    }
  },
}));

import { connectMcpClient } from "./transport";

describe("connectMcpClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createdClients.length = 0;
    connectBehavior.mockReset();
    mockSseFetch.mockReset();
  });

  it("preserves SDK headers in SSE fallback fetch", async () => {
    connectBehavior.mockImplementationOnce(async () => {
      throw new MockStreamableHTTPError(404);
    });
    connectBehavior.mockImplementationOnce(async () => {});

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));

    await connectMcpClient("https://mcp.example.com", {
      Authorization: "Bearer test-key",
    });

    expect(createdClients).toHaveLength(2);
    expect(createdClients[0].close).toHaveBeenCalledTimes(1);

    await mockSseFetch("https://mcp.example.com/sse", {
      headers: new Headers({ Accept: "text/event-stream" }),
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, forwardedInit] = fetchSpy.mock.calls[0];
    const forwardedHeaders = new Headers(
      (forwardedInit?.headers ?? {}) as HeadersInit
    );
    expect(forwardedHeaders.get("accept")).toBe("text/event-stream");
    expect(forwardedHeaders.get("authorization")).toBe("Bearer test-key");
  });
});
