// Generate per-page markdown for the homepage and public marketing pages so
// agents requesting `Accept: text/markdown` can get a clean text version.
// Run after `next build` with the production server running on $GEN_BASE_URL
// (default http://localhost:3000).
//
// - Public pages: fetch rendered HTML from the running server, convert to
//   markdown via node-html-markdown, stripping nav/footer/script chrome.
// - /docs: render directly from the OpenAPI spec (Scalar's client-side UI
//   doesn't survive HTML-to-markdown conversion).
//
// Output: public/_agent-md/<slug>.md (gitignored, regenerated each build).

import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NodeHtmlMarkdown } from "node-html-markdown";

import sitemap from "../src/app/sitemap";
import { renderOpenApiMarkdown } from "../src/lib/api/openapi-md";

const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://vernix.app").replace(/\/$/, "");
const FETCH_BASE = (process.env.GEN_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const OUT_DIR = join(process.cwd(), "public", "_agent-md");

const EXCLUDE_PREFIXES = ["/api/", "/dashboard/", "/login", "/register", "/accept-terms", "/welcome", "/unsubscribe"];

function slugify(path: string): string {
  if (path === "/" || path === "") return "index";
  return path.replace(/^\/+/, "").replace(/\/+$/, "").replace(/\//g, "_") || "index";
}

function stripChrome(html: string): string {
  // Drop header/nav/footer/script/style before conversion. Keep <main> if
  // present — otherwise the whole body.
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

async function fetchAsMarkdown(path: string, nhm: NodeHtmlMarkdown): Promise<string> {
  const res = await fetch(`${FETCH_BASE}${path}`, { headers: { Accept: "text/html" } });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  const html = await res.text();
  return nhm.translate(stripChrome(html)).trim();
}

async function main() {
  const entries = await sitemap();
  const paths = new Set<string>();
  for (const entry of entries) {
    if (typeof entry.url !== "string") continue;
    const u = entry.url.startsWith("http") ? new URL(entry.url).pathname : entry.url;
    if (EXCLUDE_PREFIXES.some((p) => u.startsWith(p))) continue;
    paths.add(u || "/");
  }
  paths.add("/");

  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  const nhm = new NodeHtmlMarkdown({ keepDataImages: false });

  const results: { path: string; slug: string; ok: boolean; error?: string }[] = [];
  for (const path of paths) {
    const slug = slugify(path);
    const outFile = join(OUT_DIR, `${slug}.md`);
    try {
      let body: string;
      if (path === "/docs") {
        body = renderOpenApiMarkdown();
      } else {
        body = await fetchAsMarkdown(path, nhm);
      }
      const header = `<!-- Source: ${BASE_URL}${path} -->\n<!-- Generated at build time from ${FETCH_BASE}${path} -->\n\n`;
      await writeFile(outFile, header + body, "utf8");
      results.push({ path, slug, ok: true });
    } catch (error) {
      results.push({ path, slug, ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  const failed = results.filter((r) => !r.ok);
  for (const r of results) {
    console.log(`  ${r.ok ? "✓" : "✗"} ${r.path}${r.error ? ` — ${r.error}` : ""}`);
  }
  console.log(`\nGenerated ${results.length - failed.length}/${results.length} pages in ${OUT_DIR}`);
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
