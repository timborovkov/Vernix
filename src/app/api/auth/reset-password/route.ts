import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { rateLimitByIp } from "@/lib/rate-limit";
import { hashResetToken } from "@/lib/auth/password-reset";

const resetSchema = z.object({
  token: z.string().min(1, "Token is required"),
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
  const tokenHash = hashResetToken(token);

  // Hash password before the transaction (CPU-intensive, no DB dependency)
  const passwordHash = await hash(newPassword, 12);

  // Atomic: consume token + update password in a single transaction
  const result = await db.transaction(async (tx) => {
    // Atomically delete and return the token
    const deleted = await tx
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .returning({
        userId: passwordResetTokens.userId,
        expiresAt: passwordResetTokens.expiresAt,
      });

    const row = deleted[0];
    if (!row) return { error: "not_found" as const };
    if (row.expiresAt < new Date()) return { error: "expired" as const };

    // Update password
    await tx
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, row.userId));

    return { success: true as const };
  });

  if ("error" in result) {
    return NextResponse.json(
      { error: "Invalid or expired reset link. Please request a new one." },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
