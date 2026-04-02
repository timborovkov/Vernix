import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { and, eq, between, or, isNull, lte } from "drizzle-orm";
import { PLANS } from "@/lib/billing/constants";
import { sendEmail } from "@/lib/email/send";
import { getTrialWarningHtml } from "@/lib/email/templates";
import { shouldSendEmail, buildUnsubscribeUrl } from "@/lib/email/preferences";

/**
 * Send trial ending warning emails at day 11 (3 days left) and day 13 (1 day left).
 * Uses a 2-day cooldown between sends to allow two warnings per trial.
 * Runs daily at 10:00 UTC.
 */
export async function runTrialWarning() {
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  // Find users whose trial ends in 0-4 days, still on free plan
  const min = now;
  const max = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

  const eligible = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      emailPreferences: users.emailPreferences,
      trialEndsAt: users.trialEndsAt,
      trialWarningEmailSentAt: users.trialWarningEmailSentAt,
    })
    .from(users)
    .where(
      and(
        eq(users.plan, PLANS.FREE),
        between(users.trialEndsAt, min, max),
        // Either never sent, or sent more than 2 days ago (allows second warning)
        or(
          isNull(users.trialWarningEmailSentAt),
          lte(users.trialWarningEmailSentAt, twoDaysAgo)
        )
      )
    );

  let sent = 0;
  for (const user of eligible) {
    if (!shouldSendEmail(user.emailPreferences, "product")) continue;

    const daysLeft = Math.max(
      1,
      Math.round(
        (user.trialEndsAt!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      )
    );
    const unsubscribeUrl = buildUnsubscribeUrl(user.id, "product");

    await sendEmail({
      to: user.email,
      subject: `Your Vernix Pro trial ends in ${daysLeft === 1 ? "1 day" : `${daysLeft} days`}`,
      html: getTrialWarningHtml(user.name, daysLeft, unsubscribeUrl),
      unsubscribeUrl,
    });

    await db
      .update(users)
      .set({ trialWarningEmailSentAt: now, updatedAt: now })
      .where(eq(users.id, user.id));

    sent++;
  }

  if (sent > 0) {
    console.log(`[Trial Warning] Sent ${sent} trial warning emails`);
  }
  return { sent };
}
