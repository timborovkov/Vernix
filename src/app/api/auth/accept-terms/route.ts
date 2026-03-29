import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function POST() {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  await db
    .update(users)
    .set({ termsAcceptedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, user.id));

  // Set a short-lived cookie to bypass the middleware terms check
  // until the JWT is refreshed on next sign-in
  const res = NextResponse.json({ success: true });
  res.cookies.set("terms_accepted", "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days (JWT refreshes within this window)
    path: "/",
  });
  return res;
}
