// RFC 9727 — https://www.rfc-editor.org/rfc/rfc9727
// Catalog returned as application/linkset+json (RFC 9264).

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://vernix.app";

export function GET() {
  const body = {
    linkset: [
      {
        anchor: `${BASE_URL}/api/v1`,
        "service-desc": [
          {
            href: `${BASE_URL}/api/v1/openapi.json`,
            type: "application/vnd.oai.openapi+json",
          },
        ],
        "service-doc": [
          { href: `${BASE_URL}/docs`, type: "text/html" },
          { href: `${BASE_URL}/llms.txt`, type: "text/markdown" },
        ],
      },
      {
        anchor: `${BASE_URL}/api/mcp`,
        // Custom rel for the MCP streamable-HTTP endpoint. Spec draft:
        // modelcontextprotocol/modelcontextprotocol#2127
        related: [{ href: `${BASE_URL}/api/mcp`, type: "application/json" }],
        describedby: [
          {
            href: `${BASE_URL}/.well-known/mcp/server-card.json`,
            type: "application/json",
          },
        ],
      },
    ],
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/linkset+json",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
