import { and, eq, isNull, lte, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  getMarketingCampaignCutoffs,
  isInactiveMarketingUser,
  isRecurringMarketingCampaignDue,
} from "@/lib/email/campaigns";
import { shouldSendEmail, buildUnsubscribeUrl } from "@/lib/email/preferences";
import { sendEmail } from "@/lib/email/send";
import { getInactiveComeBackEmailHtml } from "@/lib/email/templates";

export async function runInactiveComeback() {
  const now = new Date();
  const { inactive, cooldown } = getMarketingCampaignCutoffs(now);

  const eligibleUsers = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      emailPreferences: users.emailPreferences,
      createdAt: users.createdAt,
      lastActiveAt: users.lastActiveAt,
      lastUpgradeReminderSentAt: users.lastUpgradeReminderSentAt,
      lastComeBackEmailSentAt: users.lastComeBackEmailSentAt,
    })
    .from(users)
    .where(
      and(
        eq(users.plan, "free"),
        or(isNull(users.trialEndsAt), lte(users.trialEndsAt, now)),
        or(
          lte(users.lastActiveAt, inactive),
          and(isNull(users.lastActiveAt), lte(users.createdAt, inactive))
        ),
        or(
          isNull(users.lastUpgradeReminderSentAt),
          lte(users.lastUpgradeReminderSentAt, cooldown)
        ),
        or(
          isNull(users.lastComeBackEmailSentAt),
          lte(users.lastComeBackEmailSentAt, cooldown)
        )
      )
    );

  let sent = 0;
  let failed = 0;
  for (const user of eligibleUsers) {
    if (!isInactiveMarketingUser(user, now)) continue;
    if (!isRecurringMarketingCampaignDue(user, now)) continue;
    if (!shouldSendEmail(user.emailPreferences, "marketing")) continue;

    const unsubscribeUrl = buildUnsubscribeUrl(user.id, "marketing");
    const result = await sendEmail({
      to: user.email,
      subject: "Come back to Vernix",
      html: getInactiveComeBackEmailHtml(user.name, unsubscribeUrl),
      unsubscribeUrl,
    });
    if (!result.success) {
      failed++;
      continue;
    }

    await db
      .update(users)
      .set({ lastComeBackEmailSentAt: now, updatedAt: now })
      .where(eq(users.id, user.id));

    sent++;
  }

  console.log(`[Inactive Comeback] Sent ${sent}, failed ${failed}`);
  return { sent, failed };
}
