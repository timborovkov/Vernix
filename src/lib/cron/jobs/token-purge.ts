import { db } from "@/lib/db";
import { passwordResetTokens } from "@/lib/db/schema";
import { lt } from "drizzle-orm";

/**
 * Purge expired password reset tokens.
 * Tokens expire after 1 hour; this catches any that weren't cleaned up
 * opportunistically during new token creation.
 */
export async function runTokenPurge() {
  const result = await db
    .delete(passwordResetTokens)
    .where(lt(passwordResetTokens.expiresAt, new Date()))
    .returning({ id: passwordResetTokens.id });

  const purged = result.length;
  if (purged > 0) {
    console.log(`[Token Purge] Deleted ${purged} expired reset tokens`);
  }
  return { purged };
}
