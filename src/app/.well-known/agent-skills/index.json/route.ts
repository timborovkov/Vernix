// Agent Skills Discovery RFC v0.2.0
// https://github.com/cloudflare/agent-skills-discovery-rfc

import { createHash } from "node:crypto";
import { buildContent as buildLlmsTxt } from "@/app/llms.txt/route";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://vernix.app";

export function GET() {
  const llmsTxt = buildLlmsTxt();
  const llmsSha = createHash("sha256").update(llmsTxt).digest("hex");

  const body = {
    $schema: "https://agentskills.io/schemas/index-v0.2.0.json",
    skills: [
      {
        name: "vernix-api",
        type: "documentation",
        description:
          "Vernix REST API and MCP server reference: endpoints, authentication, rate limits, and integration catalog.",
        url: `${BASE_URL}/llms.txt`,
        sha256: llmsSha,
      },
    ],
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
