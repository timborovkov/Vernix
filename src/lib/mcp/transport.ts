import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  StreamableHTTPClientTransport,
  StreamableHTTPError,
} from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

// ---------------------------------------------------------------------------
// SSRF protection
// ---------------------------------------------------------------------------

// Reject private/loopback/link-local IPs to prevent SSRF.
// Covers: loopback (127.x, ::1, ::), unspecified (0.0.0.0),
// private ranges (10.x, 172.16-31.x, 192.168.x),
// IPv4 link-local incl. cloud metadata endpoint (169.254.x.x),
// IPv6 link-local (fe80::/10 → fe80–febf),
// IPv6 ULA (fc00::/7), and .local / .localhost mDNS/RFC-6761 hostnames.
const PRIVATE_IP_RE =
  /^((.*\.)?localhost|.*\.local|0\.0\.0\.0|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+|127\.\d+\.\d+\.\d+|::1?|fe[89ab][0-9a-f]:.*|fc[0-9a-f]{2}:.*|fd[0-9a-f]{2}:.*)$/i;

/**
 * Unwrap IPv6-mapped IPv4 addresses to their dotted-decimal form so that
 * PRIVATE_IP_RE can block them. `new URL()` normalises the brackets away but
 * keeps the address as-is, e.g.:
 *   http://[::ffff:127.0.0.1]/  →  hostname = "::ffff:127.0.0.1"
 *   http://[::ffff:7f00:1]/     →  hostname = "::ffff:7f00:1"
 */
function unwrapMappedIpv4(hostname: string): string | null {
  // Dotted-decimal form: ::ffff:a.b.c.d
  const dotted = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i.exec(
    hostname
  );
  if (dotted) return dotted[1];

  // Hex-group form: ::ffff:aabb:ccdd
  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(hostname);
  if (hex) {
    const hi = parseInt(hex[1], 16);
    const lo = parseInt(hex[2], 16);
    return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
  }

  return null;
}

/** Returns true if the URL targets a private/loopback/reserved address. */
export function isSsrfUrl(rawUrl: string): boolean {
  try {
    const { hostname } = new URL(rawUrl);
    // URL.hostname for IPv6 may include brackets in some runtimes (e.g. "[::]").
    // Normalize so PRIVATE_IP_RE and IPv6-mapped parsing work consistently.
    const normalizedHostname = hostname.replace(/^\[|\]$/g, "");
    if (PRIVATE_IP_RE.test(normalizedHostname)) return true;
    // Also block IPv6-mapped IPv4 private addresses (e.g. ::ffff:169.254.169.254)
    const mapped = unwrapMappedIpv4(normalizedHostname);
    if (mapped !== null && PRIVATE_IP_RE.test(mapped)) return true;
    return false;
  } catch {
    return true;
  }
}

// ---------------------------------------------------------------------------
// MCP client connection
// ---------------------------------------------------------------------------

const CLIENT_INFO = { name: "Vernix", version: "1.0.0" } as const;

/**
 * Create a new MCP Client and connect it to the server at `url`.
 *
 * Throws an Error with message "SSRF" if the URL resolves to a
 * private/loopback/reserved address.
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
  if (isSsrfUrl(url)) {
    throw new Error("URL resolves to a private or restricted address");
  }

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
