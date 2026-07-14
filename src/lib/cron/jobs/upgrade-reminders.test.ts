import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockDb, mockSendEmail } = vi.hoisted(() => {
  const db: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of [
    "select",
    "from",
    "where",
    "update",
    "set",
    "returning",
  ]) {
    db[method] = vi.fn().mockImplementation(() => db);
  }
  return {
    mockDb: db,
    mockSendEmail: vi.fn().mockResolvedValue({
      success: true,
      status: "sent",
    }),
  };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/email/send", () => ({ sendEmail: mockSendEmail }));

import { runUpgradeReminders } from "./upgrade-reminders";

const now = new Date("2026-07-14T12:00:00Z");
const candidate = {
  id: "user-1",
  email: "active@example.com",
  name: "Active User",
  emailPreferences: {},
  createdAt: new Date("2025-01-01T00:00:00Z"),
  lastActiveAt: new Date("2026-07-01T00:00:00Z"),
  lastUpgradeReminderSentAt: null,
  lastComeBackEmailSentAt: null,
  marketingCampaignClaimedAt: null,
};

describe("runUpgradeReminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    process.env.AUTH_SECRET = "campaign-test-secret";
    mockSendEmail.mockResolvedValue({ success: true, status: "sent" });
    mockDb.returning.mockResolvedValue([{ id: candidate.id }]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends to an active user and records the successful send", async () => {
    mockDb.where.mockResolvedValueOnce([candidate]);

    const result = await runUpgradeReminders();

    expect(result).toEqual({
      sent: 1,
      suppressed: 0,
      skipped: 0,
      failed: 0,
    });
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: candidate.email,
        subject: "Unlock more with Vernix Pro",
        unsubscribeUrl: expect.stringContaining("category=marketing"),
        idempotencyKey: "upgrade-reminder/user-1/initial",
      })
    );
    expect(mockDb.set).toHaveBeenNthCalledWith(1, {
      marketingCampaignClaimToken: expect.any(String),
      marketingCampaignClaimedAt: now,
      updatedAt: now,
    });
    expect(mockDb.set).toHaveBeenLastCalledWith({
      lastUpgradeReminderSentAt: now,
      marketingCampaignClaimToken: null,
      marketingCampaignClaimedAt: null,
      updatedAt: now,
    });
  });

  it.each([
    ["inactive", new Date("2026-03-01T00:00:00Z")],
    ["in the quiet gap", new Date("2026-06-01T00:00:00Z")],
  ])("does not send to a user who is %s", async (_, lastActiveAt) => {
    mockDb.where.mockResolvedValueOnce([{ ...candidate, lastActiveAt }]);

    const result = await runUpgradeReminders();

    expect(result).toEqual({
      sent: 0,
      suppressed: 0,
      skipped: 0,
      failed: 0,
    });
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockDb.set).not.toHaveBeenCalled();
  });

  it("respects marketing opt-out", async () => {
    mockDb.where.mockResolvedValueOnce([
      { ...candidate, emailPreferences: { marketing: false } },
    ]);

    const result = await runUpgradeReminders();

    expect(result.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("does not consume the cooldown when delivery fails", async () => {
    mockDb.where.mockResolvedValueOnce([candidate]);
    mockSendEmail.mockResolvedValueOnce({
      success: false,
      status: "failed",
      error: "provider unavailable",
    });

    const result = await runUpgradeReminders();

    expect(result).toEqual({
      sent: 0,
      suppressed: 0,
      skipped: 0,
      failed: 1,
    });
    expect(mockDb.set).toHaveBeenLastCalledWith({
      marketingCampaignClaimToken: null,
      marketingCampaignClaimedAt: null,
      updatedAt: now,
    });
  });

  it("does not send when another invocation wins the atomic claim", async () => {
    mockDb.where.mockResolvedValueOnce([candidate]);
    mockDb.returning.mockResolvedValueOnce([]);

    const result = await runUpgradeReminders();

    expect(result.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("releases the claim for a suppressed recipient", async () => {
    mockDb.where.mockResolvedValueOnce([candidate]);
    mockSendEmail.mockResolvedValueOnce({
      success: true,
      status: "suppressed",
    });

    const result = await runUpgradeReminders();

    expect(result).toEqual({
      sent: 0,
      suppressed: 1,
      skipped: 0,
      failed: 0,
    });
    expect(mockDb.set).toHaveBeenLastCalledWith({
      marketingCampaignClaimToken: null,
      marketingCampaignClaimedAt: null,
      updatedAt: now,
    });
  });

  it("does not send while another invocation has an active lease", async () => {
    mockDb.where.mockResolvedValueOnce([
      {
        ...candidate,
        marketingCampaignClaimedAt: new Date("2026-07-14T11:50:00Z"),
      },
    ]);

    const result = await runUpgradeReminders();

    expect(result.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockDb.set).not.toHaveBeenCalled();
  });

  it("retries only a stale in-flight claim with the same logical key", async () => {
    mockDb.where.mockResolvedValueOnce([
      {
        ...candidate,
        marketingCampaignClaimedAt: new Date("2026-07-14T11:00:00Z"),
      },
    ]);

    const result = await runUpgradeReminders({ recoveryOnly: true });

    expect(result.sent).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: "upgrade-reminder/user-1/initial",
      })
    );
  });

  it("does not start a new campaign send during a recovery-only run", async () => {
    mockDb.where.mockResolvedValueOnce([candidate]);

    const result = await runUpgradeReminders({ recoveryOnly: true });

    expect(result.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
