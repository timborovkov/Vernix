import { randomUUID } from "crypto";
import { and, eq, gte, isNotNull, isNull, lte, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/send";
import { getFreePlanUpgradeReminderHtml } from "@/lib/email/templates";
import { shouldSendEmail, buildUnsubscribeUrl } from "@/lib/email/preferences";
import {
  buildRecurringMarketingIdempotencyKey,
  getMarketingCampaignCutoffs,
  isActiveMarketingUser,
  isMarketingCampaignClaimAvailable,
  isRecurringMarketingCampaignDue,
} from "@/lib/email/campaigns";

interface UpgradeReminderRunOptions {
  recoveryOnly?: boolean;
}

export async function runUpgradeReminders(
  options: UpgradeReminderRunOptions = {}
) {
  const now = new Date();
  const { active, cooldown, claim } = getMarketingCampaignCutoffs(now);
  const claimPredicate = () =>
    options.recoveryOnly
      ? and(
          isNotNull(users.marketingCampaignClaimedAt),
          lte(users.marketingCampaignClaimedAt, claim)
        )
      : or(
          isNull(users.marketingCampaignClaimedAt),
          lte(users.marketingCampaignClaimedAt, claim)
        );

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
      marketingCampaignClaimedAt: users.marketingCampaignClaimedAt,
    })
    .from(users)
    .where(
      and(
        eq(users.plan, "free"),
        or(isNull(users.trialEndsAt), lte(users.trialEndsAt, now)),
        or(
          gte(users.lastActiveAt, active),
          and(isNull(users.lastActiveAt), gte(users.createdAt, active))
        ),
        or(
          isNull(users.lastUpgradeReminderSentAt),
          lte(users.lastUpgradeReminderSentAt, cooldown)
        ),
        or(
          isNull(users.lastComeBackEmailSentAt),
          lte(users.lastComeBackEmailSentAt, cooldown)
        ),
        claimPredicate()
      )
    );

  let sent = 0;
  let failed = 0;
  let suppressed = 0;
  let skipped = 0;
  for (const user of eligibleUsers) {
    if (!isActiveMarketingUser(user, now)) continue;
    if (!isRecurringMarketingCampaignDue(user, now)) continue;
    if (options.recoveryOnly && user.marketingCampaignClaimedAt === null)
      continue;
    if (
      !isMarketingCampaignClaimAvailable(user.marketingCampaignClaimedAt, now)
    )
      continue;
    if (!shouldSendEmail(user.emailPreferences, "marketing")) continue;

    const unsubscribeUrl = buildUnsubscribeUrl(user.id, "marketing");
    const claimToken = randomUUID();
    const claimed = await db
      .update(users)
      .set({
        marketingCampaignClaimToken: claimToken,
        marketingCampaignClaimedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(users.id, user.id),
          eq(users.plan, "free"),
          or(isNull(users.trialEndsAt), lte(users.trialEndsAt, now)),
          or(
            gte(users.lastActiveAt, active),
            and(isNull(users.lastActiveAt), gte(users.createdAt, active))
          ),
          or(
            isNull(users.lastUpgradeReminderSentAt),
            lte(users.lastUpgradeReminderSentAt, cooldown)
          ),
          or(
            isNull(users.lastComeBackEmailSentAt),
            lte(users.lastComeBackEmailSentAt, cooldown)
          ),
          claimPredicate()
        )
      )
      .returning({ id: users.id });
    if (claimed.length === 0) continue;

    const result = await sendEmail({
      to: user.email,
      subject: "Unlock more with Vernix Pro",
      html: getFreePlanUpgradeReminderHtml(user.name, unsubscribeUrl),
      unsubscribeUrl,
      idempotencyKey: buildRecurringMarketingIdempotencyKey(
        "upgrade-reminder",
        user.id,
        user
      ),
    });
    if (result.status !== "sent") {
      await db
        .update(users)
        .set({
          marketingCampaignClaimToken: null,
          marketingCampaignClaimedAt: null,
          updatedAt: now,
        })
        .where(
          and(
            eq(users.id, user.id),
            eq(users.marketingCampaignClaimToken, claimToken)
          )
        );

      if (result.status === "failed") failed++;
      else if (result.status === "suppressed") suppressed++;
      else skipped++;
      continue;
    }

    await db
      .update(users)
      .set({
        lastUpgradeReminderSentAt: now,
        marketingCampaignClaimToken: null,
        marketingCampaignClaimedAt: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(users.id, user.id),
          eq(users.marketingCampaignClaimToken, claimToken)
        )
      );

    sent++;
  }

  console.log(
    `[Upgrade Reminders] Sent ${sent}, suppressed ${suppressed}, skipped ${skipped}, failed ${failed}`
  );
  return { sent, suppressed, skipped, failed };
}
