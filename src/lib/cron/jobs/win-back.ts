import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { and, eq, isNull, between, or, lte } from "drizzle-orm";
import { PLANS } from "@/lib/billing/constants";
import { sendEmail } from "@/lib/email/send";
import { getWinBackEmailHtml } from "@/lib/email/templates";
import { shouldSendEmail, buildUnsubscribeUrl } from "@/lib/email/preferences";

/**
 * Send win-back emails to users who churned ~30 days ago.
 * Runs daily at 11:00 UTC.
 */
export async function runWinBack() {
  const now = new Date();
  // Find users who churned 29-31 days ago
  const min = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);
  const max = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);

  const eligible = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      emailPreferences: users.emailPreferences,
    })
    .from(users)
    .where(
      and(
        eq(users.plan, PLANS.FREE),
        between(users.churnedAt, min, max),
        isNull(users.winBackEmailSentAt),
        // Exclude users who re-subscribed (active trial or subscription)
        or(isNull(users.trialEndsAt), lte(users.trialEndsAt, now)),
        isNull(users.polarSubscriptionId)
      )
    );

  let sent = 0;
  for (const user of eligible) {
    if (!shouldSendEmail(user.emailPreferences, "marketing")) continue;

    const unsubscribeUrl = buildUnsubscribeUrl(user.id, "marketing");

    await sendEmail({
      to: user.email,
      subject: "We'd love to have you back on Vernix Pro",
      html: getWinBackEmailHtml(user.name, unsubscribeUrl),
      unsubscribeUrl,
    });

    await db
      .update(users)
      .set({ winBackEmailSentAt: now, updatedAt: now })
      .where(eq(users.id, user.id));

    sent++;
  }

  if (sent > 0) {
    console.log(`[Win-Back] Sent ${sent} win-back emails`);
  }
  return { sent };
}
