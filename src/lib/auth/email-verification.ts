import { randomBytes, createHash } from "crypto";
import { db } from "@/lib/db";
import { emailVerificationTokens } from "@/lib/db/schema";
import { eq, lt } from "drizzle-orm";

const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Hash a raw token with SHA-256 for storage */
export function hashVerificationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Generate a random token and its hash */
export function generateVerificationToken(): {
  token: string;
  tokenHash: string;
} {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashVerificationToken(token) };
}

/** Create an email verification token for a user. Returns the raw token (for the email link). */
export async function createEmailVerificationToken(
  userId: string
): Promise<string> {
  // Clean up expired tokens
  await db
    .delete(emailVerificationTokens)
    .where(lt(emailVerificationTokens.expiresAt, new Date()));

  // Delete any existing tokens for this user (only one active at a time)
  await db
    .delete(emailVerificationTokens)
    .where(eq(emailVerificationTokens.userId, userId));

  const { token, tokenHash } = generateVerificationToken();

  await db.insert(emailVerificationTokens).values({
    userId,
    tokenHash,
    expiresAt: new Date(Date.now() + TOKEN_EXPIRY_MS),
  });

  return token;
}
