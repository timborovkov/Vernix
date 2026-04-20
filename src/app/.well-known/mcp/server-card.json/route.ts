// MCP Server Card — draft schema from SEP-1649
// https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2127
// Revisit once the spec is merged.

import { readFileSync } from "node:fs";
import { join } from "node:path";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://vernix.app";

function readPackageVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8")
    );
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

export function GET() {
  const card = {
    serverInfo: {
      name: "vernix",
      version: readPackageVersion(),
      title: "Vernix — AI meeting assistant",
    },
    transport: {
      type: "streamable-http",
      url: `${BASE_URL}/api/mcp`,
    },
    authentication: {
      type: "bearer",
      description:
        "Issue an API key in the Vernix dashboard (Settings → API keys). Send it as `Authorization: Bearer kk_…`.",
      tokenFormat: "kk_*",
      obtainTokenUrl: `${BASE_URL}/dashboard/settings/api-keys`,
    },
    capabilities: { tools: {} },
    documentation: {
      url: `${BASE_URL}/docs`,
      llmsTxt: `${BASE_URL}/llms.txt`,
    },
  };

  return new Response(JSON.stringify(card, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
