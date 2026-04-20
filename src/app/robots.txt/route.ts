const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://vernix.app";

const TEXT_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "public, max-age=3600",
} as const;

export function GET() {
  if (process.env.NEXT_PUBLIC_DISABLE_INDEXING === "true") {
    return new Response("User-agent: *\nDisallow: /\n", {
      headers: TEXT_HEADERS,
    });
  }

  // Content-Signal must live inside the User-agent group (no blank line
  // before it) or the Robots Exclusion Protocol treats the group as closed
  // and parsers ignore the directive.
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /dashboard/",
    "Disallow: /api/",
    "Disallow: /welcome",
    "Content-Signal: ai-train=yes, search=yes, ai-input=yes",
    "",
    `Sitemap: ${BASE_URL}/sitemap.xml`,
    "",
  ].join("\n");

  return new Response(body, { headers: TEXT_HEADERS });
}
