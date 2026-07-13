import { describe, expect, it } from "vitest";
import {
  isActiveMarketingUser,
  isInactiveMarketingUser,
  isRecurringMarketingCampaignDue,
} from "./campaigns";

const now = new Date("2026-07-14T12:00:00Z");
const daysAgo = (days: number) =>
  new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

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
