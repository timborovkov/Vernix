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
];

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  if (PUBLIC_AGENT_PATHS.some((p) => req.nextUrl.pathname === p)) {
    return NextResponse.next();
  }

  // Redirect authenticated users away from auth pages
  const authPages = ["/login", "/register"];
  if (req.auth && authPages.includes(req.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
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
    if (req.auth?.user && !req.auth.user.termsAcceptedAt) {
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
  ],
};
