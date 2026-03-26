import { randomBytes, createHash } from "crypto";
import { db } from "@/lib/db";
import { passwordResetTokens, users } from "@/lib/db/schema";
import { eq, lt } from "drizzle-orm";

const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

/** Hash a raw token with SHA-256 for storage */
export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Generate a random token and its hash */
export function generateResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashResetToken(token) };
}

/** Create a password reset token for a user. Returns the raw token (for the email link). */
export async function createPasswordResetToken(
  userId: string
): Promise<string> {
  // Clean up expired tokens
  await db
    .delete(passwordResetTokens)
    .where(lt(passwordResetTokens.expiresAt, new Date()));

  // Delete any existing tokens for this user (only one active at a time)
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, userId));

  const { token, tokenHash } = generateResetToken();

  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash,
    expiresAt: new Date(Date.now() + TOKEN_EXPIRY_MS),
  });

  return token;
}

/** Validate a token and return the userId if valid, or null if invalid/expired. Does NOT consume the token. */
export async function validatePasswordResetToken(
  token: string
): Promise<string | null> {
  const tokenHash = hashResetToken(token);

  const [row] = await db
    .select({
      userId: passwordResetTokens.userId,
      expiresAt: passwordResetTokens.expiresAt,
    })
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash));

  if (!row) return null;
  if (row.expiresAt < new Date()) return null;

  return row.userId;
}

/** Validate and consume (delete) a token. Returns userId if valid, null otherwise. */
export async function consumePasswordResetToken(
  token: string
): Promise<string | null> {
  const userId = await validatePasswordResetToken(token);
  if (!userId) return null;

  // Delete the token (one-time use)
  const tokenHash = hashResetToken(token);
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash));

  return userId;
}

/** Look up a user by email. Returns { id, name, email } or null. */
export async function findUserByEmail(
  email: string
): Promise<{ id: string; name: string; email: string } | null> {
  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.email, email));

  return user ?? null;
}
