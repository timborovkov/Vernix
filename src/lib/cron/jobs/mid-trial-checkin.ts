import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { and, eq, isNull, between } from "drizzle-orm";
import { PLANS } from "@/lib/billing/constants";
import { sendEmail } from "@/lib/email/send";
import { getMidTrialCheckinHtml } from "@/lib/email/templates";
import { shouldSendEmail, buildUnsubscribeUrl } from "@/lib/email/preferences";

/**
 * Send mid-trial check-in emails to users ~7 days into their trial.
 * Runs daily at 10:00 UTC.
 */
export async function runMidTrialCheckin() {
  const now = new Date();
  // Find users whose trial ends in 6-8 days (i.e. ~7 days into a 14-day trial)
  const min = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);
  const max = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);

  const eligible = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      emailPreferences: users.emailPreferences,
      trialEndsAt: users.trialEndsAt,
    })
    .from(users)
    .where(
      and(
        eq(users.plan, PLANS.FREE),
        between(users.trialEndsAt, min, max),
        isNull(users.midTrialEmailSentAt)
      )
    );

  let sent = 0;
  for (const user of eligible) {
    if (!shouldSendEmail(user.emailPreferences, "product")) continue;

    const daysLeft = Math.round(
      (user.trialEndsAt!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );
    const unsubscribeUrl = buildUnsubscribeUrl(user.id, "product");

    await sendEmail({
      to: user.email,
      subject: "How's your Vernix Pro trial going?",
      html: getMidTrialCheckinHtml(user.name, daysLeft, unsubscribeUrl),
      unsubscribeUrl,
    });

    await db
      .update(users)
      .set({ midTrialEmailSentAt: now, updatedAt: now })
      .where(eq(users.id, user.id));

    sent++;
  }

  if (sent > 0) {
    console.log(`[Mid-Trial Checkin] Sent ${sent} check-in emails`);
  }
  return { sent };
}
