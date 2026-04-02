import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailVerificationTokens, users } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { hashVerificationToken } from "@/lib/auth/email-verification";
import { rateLimitByIp } from "@/lib/rate-limit";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://vernix.app";

export async function GET(request: Request) {
  const rl = rateLimitByIp(request, "auth:verify-email", {
    interval: 300_000,
    limit: 10,
  });
  if (!rl.success) {
    return NextResponse.redirect(`${appUrl}/dashboard?verified=error`);
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(`${appUrl}/dashboard?verified=error`);
  }

  const tokenHash = hashVerificationToken(token);

  const [record] = await db
    .select({
      id: emailVerificationTokens.id,
      userId: emailVerificationTokens.userId,
    })
    .from(emailVerificationTokens)
    .where(
      and(
        eq(emailVerificationTokens.tokenHash, tokenHash),
        gt(emailVerificationTokens.expiresAt, new Date())
      )
    );

  if (!record) {
    return NextResponse.redirect(`${appUrl}/dashboard?verified=error`);
  }

  // Mark email as verified and delete the token
  await db
    .update(users)
    .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, record.userId));

  await db
    .delete(emailVerificationTokens)
    .where(eq(emailVerificationTokens.id, record.id));

  return NextResponse.redirect(`${appUrl}/dashboard?verified=1`);
}
