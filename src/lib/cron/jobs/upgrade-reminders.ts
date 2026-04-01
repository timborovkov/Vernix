import { and, eq, isNull, lte, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/send";
import { getFreePlanUpgradeReminderHtml } from "@/lib/email/templates";
import { shouldSendEmail, buildUnsubscribeUrl } from "@/lib/email/preferences";

export async function runUpgradeReminders() {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const eligibleUsers = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      emailPreferences: users.emailPreferences,
    })
    .from(users)
    .where(
      and(
        eq(users.plan, "free"),
        or(isNull(users.trialEndsAt), lte(users.trialEndsAt, now)),
        or(
          isNull(users.lastUpgradeReminderSentAt),
          lte(users.lastUpgradeReminderSentAt, sevenDaysAgo)
        )
      )
    );

  const sent: string[] = [];
  for (const user of eligibleUsers) {
    if (!shouldSendEmail(user.emailPreferences, "marketing")) continue;

    const unsubscribeUrl = buildUnsubscribeUrl(user.id, "marketing");
    await sendEmail({
      to: user.email,
      subject: "Unlock more with Vernix Pro",
      html: getFreePlanUpgradeReminderHtml(user.name, unsubscribeUrl),
      unsubscribeUrl,
    });

    await db
      .update(users)
      .set({
        lastUpgradeReminderSentAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, user.id));

    sent.push(user.email);
  }

  console.log(
    `[Upgrade Reminders] Sent ${sent.length} emails:`,
    sent.join(", ") || "none"
  );
  return { sent: sent.length, emails: sent };
}
