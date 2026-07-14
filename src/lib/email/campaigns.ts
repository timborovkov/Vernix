const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

export const ACTIVE_USER_WINDOW_DAYS = 30;
export const INACTIVE_USER_WINDOW_DAYS = 90;
export const MARKETING_CAMPAIGN_COOLDOWN_DAYS = 150;
export const MARKETING_CAMPAIGN_CLAIM_TTL_MINUTES = 30;

interface UserActivity {
  createdAt: Date;
  lastActiveAt: Date | null;
}

interface CampaignHistory {
  lastUpgradeReminderSentAt: Date | null;
  lastComeBackEmailSentAt: Date | null;
}

type RecurringMarketingCampaign = "upgrade-reminder" | "inactive-comeback";

function daysBefore(now: Date, days: number): Date {
  return new Date(now.getTime() - days * DAY_MS);
}

export function getMarketingCampaignCutoffs(now: Date) {
  return {
    active: daysBefore(now, ACTIVE_USER_WINDOW_DAYS),
    inactive: daysBefore(now, INACTIVE_USER_WINDOW_DAYS),
    cooldown: daysBefore(now, MARKETING_CAMPAIGN_COOLDOWN_DAYS),
    claim: new Date(
      now.getTime() - MARKETING_CAMPAIGN_CLAIM_TTL_MINUTES * MINUTE_MS
    ),
  };
}

export function isMarketingCampaignClaimAvailable(
  claimedAt: Date | null,
  now: Date
): boolean {
  return (
    claimedAt === null || claimedAt <= getMarketingCampaignCutoffs(now).claim
  );
}

export function getEffectiveActivityAt(user: UserActivity): Date {
  return user.lastActiveAt ?? user.createdAt;
}

export function isActiveMarketingUser(user: UserActivity, now: Date): boolean {
  return (
    getEffectiveActivityAt(user) >= getMarketingCampaignCutoffs(now).active
  );
}

export function isInactiveMarketingUser(
  user: UserActivity,
  now: Date
): boolean {
  return (
    getEffectiveActivityAt(user) <= getMarketingCampaignCutoffs(now).inactive
  );
}

export function isRecurringMarketingCampaignDue(
  history: CampaignHistory,
  now: Date
): boolean {
  const { cooldown } = getMarketingCampaignCutoffs(now);
  return (
    (history.lastUpgradeReminderSentAt === null ||
      history.lastUpgradeReminderSentAt <= cooldown) &&
    (history.lastComeBackEmailSentAt === null ||
      history.lastComeBackEmailSentAt <= cooldown)
  );
}

export function buildRecurringMarketingIdempotencyKey(
  campaign: RecurringMarketingCampaign,
  userId: string,
  history: CampaignHistory
): string {
  const latestSend = [
    history.lastUpgradeReminderSentAt,
    history.lastComeBackEmailSentAt,
  ].reduce<Date | null>((latest, value) => {
    if (value === null) return latest;
    if (latest === null || value > latest) return value;
    return latest;
  }, null);

  return `${campaign}/${userId}/${latestSend?.getTime() ?? "initial"}`;
}
