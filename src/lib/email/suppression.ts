import { and, eq, isNotNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, type EmailPreferences } from "@/lib/db/schema";

// Email addresses are compared case-insensitively — the users.email column is
// plain text and the registration flow does not lowercase on insert, so a user
// who signed up as "User@Example.com" must still match a webhook event for
// "user@example.com".

export type SuppressionReason = "bounce" | "complaint";

/**
 * Mark a user's address as suppressed from future sends. Idempotent — the
 * suppression timestamp is preserved on replay. On complaints we also flip
 * marketing/product preferences off so un-suppressing later doesn't silently
 * resume non-transactional sends.
 */
export async function suppressEmail(
  email: string,
  reason: SuppressionReason
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;

  if (reason === "bounce") {
    const result = await db
      .update(users)
      .set({
        emailBouncedAt: sql`COALESCE(${users.emailBouncedAt}, NOW())`,
        updatedAt: new Date(),
      })
      .where(sql`LOWER(${users.email}) = ${normalized}`)
      .returning({ id: users.id });
    if (result.length === 0) {
      console.log(
        `[Email:suppression] No user row for bounce on ${normalized}, skipping`
      );
    }
    return;
  }

  const [row] = await db
    .select({
      id: users.id,
      emailPreferences: users.emailPreferences,
    })
    .from(users)
    .where(sql`LOWER(${users.email}) = ${normalized}`);

  if (!row) {
    console.log(
      `[Email:suppression] No user row for complaint on ${normalized}, skipping`
    );
    return;
  }

  const current = (row.emailPreferences ?? {}) as EmailPreferences;
  const nextPrefs: EmailPreferences = {
    ...current,
    marketing: false,
    product: false,
  };

  await db
    .update(users)
    .set({
      emailComplainedAt: sql`COALESCE(${users.emailComplainedAt}, NOW())`,
      emailPreferences: nextPrefs,
      updatedAt: new Date(),
    })
    .where(eq(users.id, row.id));
}

/**
 * Partition a recipient list into addresses we're allowed to send to and
 * addresses that must be skipped due to a bounce or complaint.
 */
export async function filterSuppressedEmails(
  to: string[]
): Promise<{ allowed: string[]; suppressed: string[] }> {
  const normalized = Array.from(
    new Set(to.map((e) => e.trim().toLowerCase()).filter(Boolean))
  );
  if (normalized.length === 0) {
    return { allowed: [], suppressed: [] };
  }

  const rows = await db
    .select({ email: users.email })
    .from(users)
    .where(
      and(
        sql`LOWER(${users.email}) = ANY(${normalized})`,
        or(isNotNull(users.emailBouncedAt), isNotNull(users.emailComplainedAt))
      )
    );

  const suppressedSet = new Set(rows.map((r) => r.email.toLowerCase()));
  const allowed: string[] = [];
  const suppressed: string[] = [];
  for (const original of to) {
    const key = original.trim().toLowerCase();
    if (!key) continue;
    if (suppressedSet.has(key)) suppressed.push(original);
    else allowed.push(original);
  }
  return { allowed, suppressed };
}
