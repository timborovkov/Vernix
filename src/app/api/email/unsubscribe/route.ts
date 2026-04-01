import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyUnsubscribeToken } from "@/lib/email/preferences";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const category = searchParams.get("category");
  const token = searchParams.get("token");

  if (!userId || !category || !token) {
    return NextResponse.redirect(
      new URL("/unsubscribe?status=error", request.url)
    );
  }

  if (!verifyUnsubscribeToken(token, userId, category)) {
    return NextResponse.redirect(
      new URL("/unsubscribe?status=error", request.url)
    );
  }

  // Fetch current preferences and merge the opt-out
  const [user] = await db
    .select({ emailPreferences: users.emailPreferences })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) {
    return NextResponse.redirect(
      new URL("/unsubscribe?status=error", request.url)
    );
  }

  const currentPrefs = (user.emailPreferences as Record<string, unknown>) ?? {};
  const updatedPrefs = { ...currentPrefs, [category]: false };

  await db
    .update(users)
    .set({ emailPreferences: updatedPrefs, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return NextResponse.redirect(
    new URL(`/unsubscribe?status=success&category=${category}`, request.url)
  );
}
