import type { McpServer } from "@/lib/db/schema";

/**
 * Build HTTP auth headers for an MCP server based on its authType.
 * OAuth servers return empty headers — auth is handled by the SDK's authProvider.
 */
export function buildAuthHeaders(
  server: Pick<
    McpServer,
    | "authType"
    | "authHeaderName"
    | "authHeaderValue"
    | "authUsername"
    | "authPassword"
    | "apiKey"
  >
): Record<string, string> {
  // Legacy: if apiKey is set but authType is still 'none', treat as bearer
  const effectiveAuthType =
    server.authType === "none" && server.apiKey ? "bearer" : server.authType;

  switch (effectiveAuthType) {
    case "bearer": {
      const token = server.authHeaderValue || server.apiKey;
      if (!token) return {};
      return { Authorization: `Bearer ${token}` };
    }
    case "header": {
      if (!server.authHeaderName || !server.authHeaderValue) return {};
      return { [server.authHeaderName]: server.authHeaderValue };
    }
    case "basic": {
      if (!server.authUsername) return {};
      const credentials = btoa(
        `${server.authUsername}:${server.authPassword ?? ""}`
      );
      return { Authorization: `Basic ${credentials}` };
    }
    case "oauth":
    case "none":
    default:
      return {};
  }
}
