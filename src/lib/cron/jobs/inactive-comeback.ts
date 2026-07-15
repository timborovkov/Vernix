import { randomUUID } from "crypto";
import { and, eq, gt, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  buildRecurringMarketingIdempotencyKey,
  getMarketingCampaignCutoffs,
  isInactiveMarketingUser,
  isMarketingCampaignClaimAvailable,
  isMarketingCampaignClaimRecoverable,
  isRecurringMarketingCampaignDue,
  type RecurringMarketingCampaignPayload,
} from "@/lib/email/campaigns";
import { shouldSendEmail, buildUnsubscribeUrl } from "@/lib/email/preferences";
import { sendEmail } from "@/lib/email/send";
import { getInactiveComeBackEmailHtml } from "@/lib/email/templates";

const CAMPAIGN = "inactive-comeback" as const;

interface InactiveComebackRunOptions {
  recoveryOnly?: boolean;
}

export async function runInactiveComeback(
  options: InactiveComebackRunOptions = {}
) {
  const now = new Date();
  const { inactive, cooldown, claim, recovery } =
    getMarketingCampaignCutoffs(now);
  const claimPredicate = () =>
    options.recoveryOnly
      ? and(
          eq(users.marketingCampaignClaimType, CAMPAIGN),
          isNotNull(users.marketingCampaignClaimPayload),
          isNotNull(users.marketingCampaignClaimedAt),
          lte(users.marketingCampaignClaimedAt, claim),
          isNotNull(users.marketingCampaignClaimStartedAt),
          gt(users.marketingCampaignClaimStartedAt, recovery)
        )
      : or(
          isNull(users.marketingCampaignClaimedAt),
          and(
            isNotNull(users.marketingCampaignClaimStartedAt),
            lte(users.marketingCampaignClaimStartedAt, cooldown)
          ),
          and(
            isNull(users.marketingCampaignClaimStartedAt),
            lte(users.marketingCampaignClaimedAt, cooldown)
          )
        );
  const eligibilityPredicate = () =>
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
      ),
      sql`${users.emailPreferences}->>'marketing' IS DISTINCT FROM 'false'`
    );

  const eligibleUsers = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      plan: users.plan,
      trialEndsAt: users.trialEndsAt,
      emailPreferences: users.emailPreferences,
      createdAt: users.createdAt,
      lastActiveAt: users.lastActiveAt,
      lastUpgradeReminderSentAt: users.lastUpgradeReminderSentAt,
      lastComeBackEmailSentAt: users.lastComeBackEmailSentAt,
      marketingCampaignClaimedAt: users.marketingCampaignClaimedAt,
      marketingCampaignClaimStartedAt: users.marketingCampaignClaimStartedAt,
      marketingCampaignClaimType: users.marketingCampaignClaimType,
      marketingCampaignClaimPayload: users.marketingCampaignClaimPayload,
    })
    .from(users)
    .where(and(eligibilityPredicate(), claimPredicate()));

  let sent = 0;
  let failed = 0;
  let unknown = 0;
  let suppressed = 0;
  let skipped = 0;
  for (const user of eligibleUsers) {
    const currentlyEligible =
      user.plan === "free" &&
      (user.trialEndsAt === null || user.trialEndsAt <= now) &&
      isInactiveMarketingUser(user, now) &&
      isRecurringMarketingCampaignDue(user, now) &&
      shouldSendEmail(user.emailPreferences, "marketing");

    let payload: RecurringMarketingCampaignPayload;
    if (options.recoveryOnly) {
      if (user.marketingCampaignClaimType !== CAMPAIGN) continue;
      if (user.marketingCampaignClaimPayload === null) continue;
      if (
        !isMarketingCampaignClaimRecoverable(
          user.marketingCampaignClaimedAt,
          user.marketingCampaignClaimStartedAt,
          now
        )
      )
        continue;
      if (!currentlyEligible) continue;
      payload = user.marketingCampaignClaimPayload;
    } else {
      if (
        !isMarketingCampaignClaimAvailable(
          user.marketingCampaignClaimedAt,
          user.marketingCampaignClaimStartedAt,
          now
        )
      )
        continue;
      if (!currentlyEligible) continue;

      const unsubscribeUrl = buildUnsubscribeUrl(user.id, "marketing");
      payload = {
        to: user.email,
        subject: "Come back to Vernix",
        html: getInactiveComeBackEmailHtml(user.name, unsubscribeUrl),
        unsubscribeUrl,
        idempotencyKey: buildRecurringMarketingIdempotencyKey(
          CAMPAIGN,
          user.id,
          user
        ),
      };
    }

    const claimToken = randomUUID();
    const claimed = await db
      .update(users)
      .set({
        marketingCampaignClaimToken: claimToken,
        marketingCampaignClaimedAt: now,
        ...(!options.recoveryOnly && {
          marketingCampaignClaimStartedAt: now,
          marketingCampaignClaimType: CAMPAIGN,
          marketingCampaignClaimPayload: payload,
        }),
        updatedAt: now,
      })
      .where(
        and(eq(users.id, user.id), eligibilityPredicate(), claimPredicate())
      )
      .returning({ id: users.id });
    if (claimed.length === 0) continue;

    const result = await sendEmail({
      ...payload,
    });
    if (result.status !== "sent") {
      if (result.status === "unknown") {
        unknown++;
        continue;
      }

      await db
        .update(users)
        .set({
          marketingCampaignClaimToken: null,
          marketingCampaignClaimedAt: null,
          marketingCampaignClaimStartedAt: null,
          marketingCampaignClaimType: null,
          marketingCampaignClaimPayload: null,
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

    const finalized = await db
      .update(users)
      .set({
        lastComeBackEmailSentAt: now,
        marketingCampaignClaimToken: null,
        marketingCampaignClaimedAt: null,
        marketingCampaignClaimStartedAt: null,
        marketingCampaignClaimType: null,
        marketingCampaignClaimPayload: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(users.id, user.id),
          eq(users.marketingCampaignClaimToken, claimToken)
        )
      )
      .returning({ id: users.id });

    if (finalized.length === 0) {
      failed++;
      continue;
    }

    sent++;
  }

  console.log(
    `[Inactive Comeback] Sent ${sent}, suppressed ${suppressed}, skipped ${skipped}, failed ${failed}, unknown ${unknown}`
  );
  return { sent, suppressed, skipped, failed, unknown };
}
