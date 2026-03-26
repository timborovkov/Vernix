import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { rateLimitByIp } from "@/lib/rate-limit";
import { consumePasswordResetToken } from "@/lib/auth/password-reset";

const resetSchema = z.object({
  token: z.string().min(1, "Token is required"),
  email: z.email(),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: Request) {
  const rl = rateLimitByIp(request, "auth:reset-password", {
    interval: 300_000, // 5 minutes
    limit: 5,
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

  const parsed = resetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { token, newPassword } = parsed.data;

  // Validate and consume the token (one-time use)
  const userId = await consumePasswordResetToken(token);
  if (!userId) {
    return NextResponse.json(
      { error: "Invalid or expired reset link. Please request a new one." },
      { status: 400 }
    );
  }

  // Hash and update password
  const passwordHash = await hash(newPassword, 12);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return NextResponse.json({ success: true });
}
