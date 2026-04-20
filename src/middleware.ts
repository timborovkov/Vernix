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

// Paths that the middleware is actually responsible for gating (auth +
// terms acceptance). These mirror the original explicit matcher entries.
// The broader `Accept: text/markdown` matcher below runs middleware on
// many more paths — for those, we short-circuit after the markdown check
// without running the auth block, otherwise unauthenticated agent calls
// to public APIs (e.g. `/api/v1/*`, `/.well-known/*`) would 401 or be
// redirected to `/login`.
function isAuthGatedPath(pathname: string): boolean {
  if (pathname.startsWith("/dashboard/") || pathname === "/dashboard")
    return true;
  if (
    pathname === "/welcome-to-pro" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/accept-terms" ||
    pathname === "/welcome"
  ) {
    return true;
  }
  const GATED_API_PREFIXES = [
    "/api/meetings",
    "/api/agent",
    "/api/search",
    "/api/knowledge",
    "/api/tasks",
    "/api/settings",
    "/api/user",
    "/api/mcp",
  ];
  if (
    GATED_API_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    )
  ) {
    return true;
  }
  if (pathname === "/api/billing" || pathname === "/api/export") return true;
  return false;
}

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  // Markdown content negotiation — when an agent sends `Accept: text/markdown`
  // on a public page, rewrite to /api/agent-md which renders markdown
  // on-demand from the HTML response, cached in-process for 1h. Runs before
  // auth so it works without a session.
  const accept = req.headers.get("accept") ?? "";
  if (
    accept.includes("text/markdown") &&
    !MD_EXCLUDE_PREFIXES.some((p) => req.nextUrl.pathname.startsWith(p))
  ) {
    const url = req.nextUrl.clone();
    const originalPath = req.nextUrl.pathname;
    url.pathname = "/api/agent-md";
    url.search = "";
    // Pass the original path via a request header — request.url in the
    // downstream handler reflects the client's URL, not the rewrite target,
    // so query params on the rewritten URL would be invisible.
    const forwarded = new Headers(req.headers);
    forwarded.set("x-agent-md-path", originalPath);
    return NextResponse.rewrite(url, { request: { headers: forwarded } });
  }

  // Only the paths in `isAuthGatedPath` are this middleware's responsibility
  // to gate. The `Accept: text/markdown` matcher below may bring in paths
  // that have their own auth model (e.g. `/api/v1/*` uses API keys, public
  // `/.well-known/*` endpoints have none) — pass those through untouched.
  if (!isAuthGatedPath(req.nextUrl.pathname)) {
    return NextResponse.next();
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
