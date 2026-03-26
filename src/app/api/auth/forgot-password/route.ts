import { NextResponse } from "next/server";
import { after } from "next/server";
import { z } from "zod/v4";
import { rateLimitByIp } from "@/lib/rate-limit";
import {
  findUserByEmail,
  createPasswordResetToken,
} from "@/lib/auth/password-reset";
import { sendEmail } from "@/lib/email/send";
import { getPasswordResetEmailHtml } from "@/lib/email/templates";

const forgotSchema = z.object({
  email: z.email(),
});

export async function POST(request: Request) {
  const rl = rateLimitByIp(request, "auth:forgot-password", {
    interval: 300_000, // 5 minutes
    limit: 3,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = forgotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { email } = parsed.data;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://vernix.app";

  // Run after response is sent — prevents timing side-channels and
  // keeps the serverless function alive until the work completes.
  after(async () => {
    try {
      const user = await findUserByEmail(email);
      if (!user) return;

      const token = await createPasswordResetToken(user.id);
      const resetUrl = `${appUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

      await sendEmail({
        to: email,
        subject: "Reset your Vernix password",
        html: getPasswordResetEmailHtml(user.name, resetUrl),
      });
    } catch (err) {
      console.error("[ForgotPassword] Error:", err);
    }
  });

  return NextResponse.json({
    success: true,
    message:
      "If an account exists with that email, you'll receive a reset link shortly.",
  });
}
