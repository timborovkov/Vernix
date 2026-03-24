import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  StreamableHTTPClientTransport,
  StreamableHTTPError,
} from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const CLIENT_INFO = { name: "KiviKova", version: "1.0.0" } as const;

/**
 * Create a new MCP Client and connect it to the server at `url`.
 *
 * Tries Streamable HTTP first (MCP spec 2025-03-26+). Falls back to SSE only
 * when the server returns 404 or 405 — indicating it doesn't speak the newer
 * protocol. Any other error (auth, network, etc.) is re-thrown immediately.
 *
 * A fresh Client is created for each attempt so that the SSE fallback never
 * reuses a Client whose internal transport state was dirtied by the failed
 * Streamable HTTP connect (see MCP SDK issue #1405).
 */
export async function connectMcpClient(
  url: string,
  headers: Record<string, string>
): Promise<Client> {
  // --- Streamable HTTP attempt ---
  const streamableClient = new Client(CLIENT_INFO);
  try {
    const transport = new StreamableHTTPClientTransport(new URL(url), {
      requestInit: { headers },
    });
    await streamableClient.connect(transport);
    return streamableClient;
  } catch (err) {
    if (
      !(
        err instanceof StreamableHTTPError &&
        (err.code === 404 || err.code === 405)
      )
    ) {
      throw err;
    }
    // 404/405 → server doesn't support Streamable HTTP, fall through to SSE.
    // Close the abandoned client to release any internal listeners/timers.
    await streamableClient.close().catch(() => {});
  }

  // --- SSE fallback (fresh Client) ---
  const sseClient = new Client(CLIENT_INFO);
  const sseTransport = new SSEClientTransport(new URL(url), {
    requestInit: { headers },
    eventSourceInit: {
      fetch: (u, init) =>
        fetch(u, {
          ...init,
          // Normalize init.headers to a plain object regardless of whether the
          // SDK passes a Headers instance or a plain record — spreading a Headers
          // instance directly yields {} and silently drops all SDK-set headers.
          headers: Object.fromEntries([
            ...new Headers(init?.headers ?? {}),
            ...Object.entries(headers),
          ]),
        }),
    },
  });
  await sseClient.connect(sseTransport);
  return sseClient;
}
