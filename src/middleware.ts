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
];

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  if (PUBLIC_AGENT_PATHS.some((p) => req.nextUrl.pathname === p)) {
    return NextResponse.next();
  }

  if (!req.auth) {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/meetings/:path*",
    "/api/agent/:path*",
    "/api/search/:path*",
    "/api/knowledge/:path*",
    "/api/tasks/:path*",
    "/api/settings/:path*",
    "/api/user/:path*",
    "/api/export",
    "/api/mcp",
  ],
};
