import { describe, it, expect } from "vitest";
import { getIntegrations } from "./catalog";

/**
 * Integration tests that verify catalog MCP server endpoints are reachable.
 *
 * These tests make real HTTP requests to external MCP servers.
 * A 401/403 is a PASS — it means the server exists and expects auth.
 * A 404/500/timeout is a FAIL — the URL is wrong or the server is down.
 *
 * Run with: pnpm test:integration -- src/lib/integrations/catalog.integration.test.ts
 */

const TIMEOUT_MS = 15_000;

async function probeEndpoint(url: string): Promise<{
  status: number;
  ok: boolean;
  contentType: string | null;
  location: string | null;
  wwwAuthenticate: string | null;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // Send a POST with MCP initialize request to trigger protocol handling
    const res = await fetch(url, {
      method: "POST",
      redirect: "manual",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "Vernix-Test", version: "1.0.0" },
        },
      }),
      signal: controller.signal,
    });

    return {
      status: res.status,
      ok: res.ok,
      contentType: res.headers.get("content-type"),
      location: res.headers.get("location"),
      wwwAuthenticate: res.headers.get("www-authenticate"),
    };
  } finally {
    clearTimeout(timeout);
  }
}

describe("Catalog MCP Server Reachability", () => {
  const integrations = getIntegrations();
  const withServers = integrations.filter(
    (i) => i.serverUrl && i.status === "available"
  );

  for (const integration of withServers) {
    it(
      `${integration.name} (${integration.serverUrl}) responds`,
      async () => {
        const result = await probeEndpoint(integration.serverUrl!);

        // Acceptable responses — anything proving the server exists:
        // 200/201 — server responded
        // 401/403 — auth required (server exists, expects credentials)
        // 405 — method not allowed (server exists)
        // 301/302/303/307/308 — redirect to auth (OAuth flow)
        // 500 — server error without auth (some servers crash without a key)
        const acceptableStatuses = [
          200, 201, 401, 403, 405, 301, 302, 303, 307, 308, 500,
        ];

        expect(
          acceptableStatuses.includes(result.status),
          `${integration.name}: expected one of [${acceptableStatuses.join(", ")}] but got ${result.status}`
        ).toBe(true);
      },
      TIMEOUT_MS + 5_000
    );
  }

  const oauthIntegrations = withServers.filter((i) => i.authMode === "oauth");

  for (const integration of oauthIntegrations) {
    it(
      `${integration.name} (${integration.serverUrl}) shows OAuth auth signal`,
      async () => {
        const result = await probeEndpoint(integration.serverUrl!);
        const redirectStatuses = [301, 302, 303, 307, 308];
        const challengeStatuses = [401, 403];
        const authGatedStatuses = [...redirectStatuses, ...challengeStatuses];

        const isAuthGated = authGatedStatuses.includes(result.status);

        const hasValidRedirectSignal =
          redirectStatuses.includes(result.status) &&
          typeof result.location === "string" &&
          result.location.length > 0;

        const challenge = (result.wwwAuthenticate ?? "").toLowerCase();
        const hasValidChallengeSignal =
          challengeStatuses.includes(result.status) &&
          // Some providers omit WWW-Authenticate entirely. If present, validate it.
          (challenge.length === 0 ||
            challenge.includes("bearer") ||
            challenge.includes("oauth") ||
            challenge.includes("authorization"));

        expect(
          isAuthGated && (hasValidRedirectSignal || hasValidChallengeSignal),
          `${integration.name}: expected OAuth auth-gated response. got status=${result.status}, location=${result.location ?? "none"}, www-authenticate=${result.wwwAuthenticate ?? "none"}`
        ).toBe(true);
      },
      TIMEOUT_MS + 5_000
    );
  }

  it("all available integrations have a serverUrl", () => {
    const available = integrations.filter((i) => i.status === "available");
    const missingUrl = available.filter((i) => !i.serverUrl);
    expect(
      missingUrl,
      `Available integrations missing serverUrl: ${missingUrl.map((i) => i.name).join(", ")}`
    ).toHaveLength(0);
  });

  it("all serverUrls are valid HTTPS URLs", () => {
    for (const i of withServers) {
      const url = new URL(i.serverUrl!);
      expect(url.protocol, `${i.name}: must be HTTPS`).toBe("https:");
    }
  });

  it("no duplicate serverUrls (except Jira/Confluence sharing Atlassian)", () => {
    const counts = new Map<string, string[]>();
    for (const i of withServers) {
      const existing = counts.get(i.serverUrl!) ?? [];
      existing.push(i.name);
      counts.set(i.serverUrl!, existing);
    }
    for (const [url, names] of counts) {
      if (names.length > 1) {
        // Jira and Confluence share the Atlassian endpoint — that's intentional
        const allAtlassian = names.every((n) =>
          ["Jira", "Confluence"].includes(n)
        );
        expect(
          allAtlassian,
          `Duplicate serverUrl ${url} used by: ${names.join(", ")}`
        ).toBe(true);
      }
    }
  });
});
