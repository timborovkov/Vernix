import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireSessionUser } from "@/lib/auth/session";
import { rateLimitByIp } from "@/lib/rate-limit";
import { createEmailVerificationToken } from "@/lib/auth/email-verification";
import { sendEmail } from "@/lib/email/send";
import { getEmailVerificationHtml } from "@/lib/email/templates";

export async function POST(request: Request) {
  const rl = rateLimitByIp(request, "auth:resend-verification", {
    interval: 300_000,
    limit: 3,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const sessionUser = await requireSessionUser();
  if (sessionUser instanceof NextResponse) return sessionUser;

  // Check if already verified
  const [user] = await db
    .select({
      emailVerifiedAt: users.emailVerifiedAt,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, sessionUser.id));

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.emailVerifiedAt) {
    return NextResponse.json({ message: "Email already verified" });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://vernix.app";
  const token = await createEmailVerificationToken(sessionUser.id);
  const verifyUrl = `${appUrl}/api/auth/verify-email?token=${token}`;

  await sendEmail({
    to: user.email,
    subject: "Verify your Vernix email",
    html: getEmailVerificationHtml(user.name, verifyUrl),
  });

  return NextResponse.json({ success: true });
}
