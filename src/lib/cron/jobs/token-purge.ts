import { db } from "@/lib/db";
import { passwordResetTokens, emailVerificationTokens } from "@/lib/db/schema";
import { lt } from "drizzle-orm";

/**
 * Purge expired password reset and email verification tokens.
 * Password reset tokens expire after 1 hour, verification tokens after 24 hours.
 */
export async function runTokenPurge() {
  const now = new Date();

  const resetResult = await db
    .delete(passwordResetTokens)
    .where(lt(passwordResetTokens.expiresAt, now))
    .returning({ id: passwordResetTokens.id });

  const verifyResult = await db
    .delete(emailVerificationTokens)
    .where(lt(emailVerificationTokens.expiresAt, now))
    .returning({ id: emailVerificationTokens.id });

  const purgedReset = resetResult.length;
  const purgedVerify = verifyResult.length;
  const purged = purgedReset + purgedVerify;

  if (purged > 0) {
    console.log(
      `[Token Purge] Deleted ${purgedReset} expired reset tokens, ${purgedVerify} expired verification tokens`
    );
  }
  return { purged, purgedReset, purgedVerify };
}
