import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyUnsubscribeToken } from "@/lib/email/preferences";

/**
 * Process the unsubscribe: verify token, update preferences, return result.
 */
async function processUnsubscribe(
  userId: string,
  category: string,
  token: string
): Promise<{ success: boolean }> {
  if (!verifyUnsubscribeToken(token, userId, category)) {
    return { success: false };
  }

  const [user] = await db
    .select({ emailPreferences: users.emailPreferences })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) return { success: false };

  const currentPrefs = (user.emailPreferences as Record<string, unknown>) ?? {};
  const updatedPrefs = { ...currentPrefs, [category]: false };

  await db
    .update(users)
    .set({ emailPreferences: updatedPrefs, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return { success: true };
}

/** Browser click — redirects to confirmation page */
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

  const { success } = await processUnsubscribe(userId, category, token);

  return NextResponse.redirect(
    new URL(
      success
        ? `/unsubscribe?status=success&category=${category}`
        : "/unsubscribe?status=error",
      request.url
    )
  );
}

/**
 * RFC 8058 one-click unsubscribe — email clients (Gmail, Apple Mail) POST here.
 * The List-Unsubscribe URL contains all params in the query string.
 */
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const category = searchParams.get("category");
  const token = searchParams.get("token");

  if (!userId || !category || !token) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const { success } = await processUnsubscribe(userId, category, token);

  if (!success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
