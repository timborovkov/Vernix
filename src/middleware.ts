import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";
import { NextResponse } from "next/server";

// Endpoints using non-session auth (botSecret or API key)
const PUBLIC_AGENT_PATHS = [
  "/api/agent/voice-token",
  "/api/agent/rag",
  "/api/agent/mcp-tool",
  "/api/agent/leave",
  "/api/agent/switch-mode",
  "/api/agent/mute-self",
  "/api/agent/activation-status",
  "/api/agent/voice-fallback",
  "/api/agent/wake-detect",
  "/api/mcp",
  "/api/mcp/oauth/callback",
  "/api/auth/verify-email",
  "/api/email/unsubscribe",
];

// Paths that should NOT serve a markdown alternate: APIs, dashboard, auth
// flows, and anything Next.js owns. Extra protected paths from the matcher
// below are skipped automatically because this check only runs on requests
// that carry `Accept: text/markdown`.
const MD_EXCLUDE_PREFIXES = [
  "/api/",
  "/dashboard",
  "/login",
  "/register",
  "/accept-terms",
  "/welcome",
  "/welcome-to-pro",
  "/unsubscribe",
  "/_next",
  "/.well-known",
];

function markdownSlug(pathname: string): string {
  if (pathname === "/" || pathname === "") return "index";
  return (
    pathname
      .replace(/^\/+/, "")
      .replace(/\/+$/, "")
      .replace(/\//g, "_") || "index"
  );
}

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  // Markdown content negotiation — serve the pre-generated markdown version
  // of public pages when an agent sends `Accept: text/markdown`. Runs before
  // auth so it works without a session.
  const accept = req.headers.get("accept") ?? "";
  if (
    accept.includes("text/markdown") &&
    !MD_EXCLUDE_PREFIXES.some((p) => req.nextUrl.pathname.startsWith(p))
  ) {
    const url = req.nextUrl.clone();
    url.pathname = `/agent-md/${markdownSlug(req.nextUrl.pathname)}.md`;
    return NextResponse.rewrite(url, {
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  }

  if (PUBLIC_AGENT_PATHS.some((p) => req.nextUrl.pathname === p)) {
    return NextResponse.next();
  }

  // Redirect authenticated users away from auth pages
  const authPages = ["/login", "/register"];
  if (req.auth && authPages.includes(req.nextUrl.pathname)) {
    const dest = req.auth.user?.termsAcceptedAt
      ? "/dashboard"
      : "/accept-terms";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  if (!req.auth) {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Don't redirect auth pages to login (they ARE the login)
    if (authPages.includes(req.nextUrl.pathname)) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Enforce terms acceptance for authenticated users on protected routes
  // Skip for: accept-terms page itself, its API, welcome page, and API routes
  const termsExempt = ["/accept-terms", "/welcome", "/welcome-to-pro"];
  const isApi = req.nextUrl.pathname.startsWith("/api/");
  if (!isApi && !termsExempt.includes(req.nextUrl.pathname)) {
    const termsInJwt = req.auth?.user?.termsAcceptedAt;
    const termsCookie = req.cookies.get("terms_accepted")?.value === "1";
    if (req.auth?.user && !termsInJwt && !termsCookie) {
      return NextResponse.redirect(new URL("/accept-terms", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/welcome-to-pro",
    "/login",
    "/register",
    "/accept-terms",
    "/welcome",
    "/api/meetings/:path*",
    "/api/agent/:path*",
    "/api/search/:path*",
    "/api/knowledge/:path*",
    "/api/tasks/:path*",
    "/api/settings/:path*",
    "/api/user/:path*",
    "/api/billing",
    "/api/export",
    "/api/mcp",
    "/api/mcp/:path*",
    // Markdown negotiation: any page request with `Accept: text/markdown`
    // runs the middleware so we can rewrite to /agent-md/<slug>.md. The
    // header `has` guard keeps this off the hot path for normal browsing.
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|mp4|webm|woff2?|ttf|eot|map|json|xml|txt)).*)",
      has: [{ type: "header", key: "accept", value: ".*text/markdown.*" }],
    },
  ],
};
