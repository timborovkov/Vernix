// On-demand Markdown-for-Agents renderer. The middleware rewrites
// `Accept: text/markdown` requests for public pages to
// `/api/agent-md?path=<original-path>`. We fetch the HTML version of the
// page from our own origin, strip chrome, and convert to markdown. Results
// are cached in-process for 1h so only the first agent per path per instance
// pays the render cost.
//
// `/docs` is special-cased: we render markdown directly from the OpenAPI
// spec because Scalar's client-rendered UI doesn't survive HTML-to-markdown.

import { NodeHtmlMarkdown } from "node-html-markdown";

import { renderOpenApiMarkdown } from "@/lib/api/openapi-md";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const CACHE_MAX_ENTRIES = 200;

type CacheEntry = { body: string; expires: number };
const cache = new Map<string, CacheEntry>();

function getCached(key: string): string | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expires < Date.now()) {
    // eslint-disable-next-line drizzle/enforce-delete-with-where -- Map.delete
    cache.delete(key);
    return undefined;
  }
  return entry.body;
}

function setCached(key: string, body: string): void {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    // Cheap LRU-ish eviction: drop oldest insertion.
    const first = cache.keys().next().value;
    // eslint-disable-next-line drizzle/enforce-delete-with-where -- Map.delete
    if (first) cache.delete(first);
  }
  cache.set(key, { body, expires: Date.now() + CACHE_TTL_MS });
}

const nhm = new NodeHtmlMarkdown({ keepDataImages: false });

function stripChrome(html: string): string {
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const core = mainMatch ? mainMatch[1] : html;
  return core
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "");
}

function isSafePath(p: string): boolean {
  // Only render absolute same-origin paths. Block scheme/host injection and
  // anything that could recurse into /api/*.
  if (!p.startsWith("/") || p.startsWith("//")) return false;
  if (p.startsWith("/api/")) return false;
  return true;
}

async function renderPath(origin: string, path: string): Promise<string> {
  if (path === "/docs") return renderOpenApiMarkdown();

  const res = await fetch(`${origin}${path}`, {
    headers: {
      // Explicitly ask for HTML — the middleware's markdown negotiation
      // triggers only on `Accept: text/markdown`, so we avoid the loop.
      Accept: "text/html",
    },
  });
  if (!res.ok) {
    throw new Error(`Upstream ${path} returned ${res.status}`);
  }
  const html = await res.text();
  return nhm.translate(stripChrome(html)).trim();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  // The middleware passes the original path via `x-agent-md-path` because
  // request.url reflects the client's URL, not the rewrite target. Fall back
  // to the `path` query param so direct hits from tooling / warmers work.
  const rawPath =
    request.headers.get("x-agent-md-path") ??
    url.searchParams.get("path") ??
    "/";
  const path = rawPath === "" ? "/" : rawPath;

  if (!isSafePath(path)) {
    return new Response("Invalid path", { status: 400 });
  }

  const cached = getCached(path);
  if (cached !== undefined) {
    return new Response(cached, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
        "X-Agent-Md-Cache": "HIT",
      },
    });
  }

  try {
    const body = await renderPath(url.origin, path);
    const withHeader =
      `<!-- Source: ${url.origin}${path} -->\n` +
      `<!-- Rendered on-demand from HTML; cached ${CACHE_TTL_MS / 1000}s -->\n\n` +
      body;
    setCached(path, withHeader);
    return new Response(withHeader, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
        "X-Agent-Md-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("[agent-md] render failed:", error);
    return new Response("Unable to render markdown for this path", {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
