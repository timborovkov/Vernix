import { describe, expect, it } from "vitest";
import {
  buildRecurringMarketingIdempotencyKey,
  isActiveMarketingUser,
  isInactiveMarketingUser,
  isMarketingCampaignClaimAvailable,
  isMarketingCampaignClaimRecoverable,
  isRecurringMarketingCampaignDue,
} from "./campaigns";

const now = new Date("2026-07-14T12:00:00Z");
const daysAgo = (days: number) =>
  new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
const minutesAgo = (minutes: number) =>
  new Date(now.getTime() - minutes * 60 * 1000);
const hoursAgo = (hours: number) =>
  new Date(now.getTime() - hours * 60 * 60 * 1000);

describe("marketing campaign audiences", () => {
  it("treats recent activity and the exact 30-day boundary as active", () => {
    expect(
      isActiveMarketingUser(
        { createdAt: daysAgo(365), lastActiveAt: daysAgo(2) },
        now
      )
    ).toBe(true);
    expect(
      isActiveMarketingUser(
        { createdAt: daysAgo(365), lastActiveAt: daysAgo(30) },
        now
      )
    ).toBe(true);
  });

  it("uses createdAt when lastActiveAt has not been recorded", () => {
    expect(
      isActiveMarketingUser({ createdAt: daysAgo(10), lastActiveAt: null }, now)
    ).toBe(true);
  });

  it("treats the exact 90-day boundary as inactive", () => {
    expect(
      isInactiveMarketingUser(
        { createdAt: daysAgo(365), lastActiveAt: daysAgo(90) },
        now
      )
    ).toBe(true);
  });

  it("leaves users in the 31-to-89-day quiet gap in neither audience", () => {
    const user = { createdAt: daysAgo(365), lastActiveAt: daysAgo(60) };

    expect(isActiveMarketingUser(user, now)).toBe(false);
    expect(isInactiveMarketingUser(user, now)).toBe(false);
  });
});

describe("recurring marketing campaign cooldown", () => {
  it("blocks either campaign after a recent Pro reminder", () => {
    expect(
      isRecurringMarketingCampaignDue(
        {
          lastUpgradeReminderSentAt: daysAgo(20),
          lastComeBackEmailSentAt: null,
        },
        now
      )
    ).toBe(false);
  });

  it("blocks either campaign after a recent comeback email", () => {
    expect(
      isRecurringMarketingCampaignDue(
        {
          lastUpgradeReminderSentAt: null,
          lastComeBackEmailSentAt: daysAgo(20),
        },
        now
      )
    ).toBe(false);
  });

  it("allows a campaign when both sends are null or at least 150 days old", () => {
    expect(
      isRecurringMarketingCampaignDue(
        {
          lastUpgradeReminderSentAt: daysAgo(150),
          lastComeBackEmailSentAt: null,
        },
        now
      )
    ).toBe(true);
    expect(
      isRecurringMarketingCampaignDue(
        {
          lastUpgradeReminderSentAt: daysAgo(200),
          lastComeBackEmailSentAt: daysAgo(151),
        },
        now
      )
    ).toBe(true);
  });
});

describe("marketing campaign claims", () => {
  it("does not recover a claim while its lease is active", () => {
    expect(
      isMarketingCampaignClaimRecoverable(minutesAgo(10), hoursAgo(1), now)
    ).toBe(false);
  });

  it("recovers an abandoned claim only inside the provider window", () => {
    expect(
      isMarketingCampaignClaimRecoverable(minutesAgo(30), hoursAgo(23), now)
    ).toBe(true);
    expect(
      isMarketingCampaignClaimRecoverable(minutesAgo(30), hoursAgo(24), now)
    ).toBe(false);
    expect(isMarketingCampaignClaimRecoverable(null, hoursAgo(1), now)).toBe(
      false
    );
  });

  it("releases an unresolved attempt only after the shared cooldown", () => {
    expect(
      isMarketingCampaignClaimAvailable(hoursAgo(1), daysAgo(149), now)
    ).toBe(false);
    expect(
      isMarketingCampaignClaimAvailable(hoursAgo(1), daysAgo(150), now)
    ).toBe(true);
    expect(isMarketingCampaignClaimAvailable(daysAgo(149), null, now)).toBe(
      false
    );
    expect(isMarketingCampaignClaimAvailable(daysAgo(150), null, now)).toBe(
      true
    );
    expect(isMarketingCampaignClaimAvailable(null, null, now)).toBe(true);
  });
});

describe("recurring marketing campaign idempotency", () => {
  it("keeps the key stable while the successful-send history is unchanged", () => {
    const history = {
      lastUpgradeReminderSentAt: daysAgo(200),
      lastComeBackEmailSentAt: null,
    };

    expect(
      buildRecurringMarketingIdempotencyKey(
        "inactive-comeback",
        "user-1",
        history
      )
    ).toBe(
      buildRecurringMarketingIdempotencyKey(
        "inactive-comeback",
        "user-1",
        history
      )
    );
  });

  it("starts a new logical send after either campaign records success", () => {
    const initial = buildRecurringMarketingIdempotencyKey(
      "upgrade-reminder",
      "user-1",
      {
        lastUpgradeReminderSentAt: null,
        lastComeBackEmailSentAt: null,
      }
    );
    const afterComeback = buildRecurringMarketingIdempotencyKey(
      "upgrade-reminder",
      "user-1",
      {
        lastUpgradeReminderSentAt: daysAgo(200),
        lastComeBackEmailSentAt: daysAgo(150),
      }
    );

    expect(initial).toBe("upgrade-reminder/user-1/initial");
    expect(afterComeback).toBe(
      `upgrade-reminder/user-1/${daysAgo(150).getTime()}`
    );
    expect(afterComeback).not.toBe(initial);
  });
});
