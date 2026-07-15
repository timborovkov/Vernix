import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

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

import { runInactiveComeback } from "./inactive-comeback";

const now = new Date("2026-07-14T12:00:00Z");
const candidate = {
  id: "user-1",
  email: "inactive@example.com",
  name: "Inactive User",
  plan: "free" as const,
  trialEndsAt: null,
  emailPreferences: {},
  createdAt: new Date("2025-01-01T00:00:00Z"),
  lastActiveAt: null,
  lastUpgradeReminderSentAt: null,
  lastComeBackEmailSentAt: null,
  marketingCampaignClaimedAt: null,
  marketingCampaignClaimStartedAt: null,
  marketingCampaignClaimType: null,
  marketingCampaignClaimPayload: null,
};

const storedComebackPayload = {
  to: "original@example.com",
  subject: "Come back to Vernix",
  html: "<p>Original comeback email</p>",
  unsubscribeUrl: "https://vernix.app/original-unsubscribe",
  idempotencyKey: "inactive-comeback/user-1/initial",
};

describe("runInactiveComeback", () => {
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

  it("sends to an old account with no recorded activity and records success", async () => {
    mockDb.where.mockResolvedValueOnce([candidate]);

    const result = await runInactiveComeback();

    expect(result).toEqual({
      sent: 1,
      suppressed: 0,
      skipped: 0,
      failed: 0,
    });
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: candidate.email,
        subject: "Come back to Vernix",
        unsubscribeUrl: expect.stringContaining("category=marketing"),
        idempotencyKey: "inactive-comeback/user-1/initial",
      })
    );
    expect(mockDb.set).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        marketingCampaignClaimToken: expect.any(String),
        marketingCampaignClaimedAt: now,
        marketingCampaignClaimStartedAt: now,
        marketingCampaignClaimType: "inactive-comeback",
        marketingCampaignClaimPayload: expect.objectContaining({
          idempotencyKey: "inactive-comeback/user-1/initial",
          to: candidate.email,
        }),
        updatedAt: now,
      })
    );
    expect(mockDb.set).toHaveBeenLastCalledWith({
      lastComeBackEmailSentAt: now,
      marketingCampaignClaimToken: null,
      marketingCampaignClaimedAt: null,
      marketingCampaignClaimStartedAt: null,
      marketingCampaignClaimType: null,
      marketingCampaignClaimPayload: null,
      updatedAt: now,
    });
  });

  it("does not send to an active user", async () => {
    mockDb.where.mockResolvedValueOnce([
      { ...candidate, lastActiveAt: new Date("2026-07-01T00:00:00Z") },
    ]);

    const result = await runInactiveComeback();

    expect(result).toEqual({
      sent: 0,
      suppressed: 0,
      skipped: 0,
      failed: 0,
    });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("respects the shared cooldown after a Pro reminder", async () => {
    mockDb.where.mockResolvedValueOnce([
      {
        ...candidate,
        lastUpgradeReminderSentAt: new Date("2026-07-01T00:00:00Z"),
      },
    ]);

    const result = await runInactiveComeback();

    expect(result.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("respects marketing opt-out", async () => {
    mockDb.where.mockResolvedValueOnce([
      { ...candidate, emailPreferences: { marketing: false } },
    ]);

    const result = await runInactiveComeback();

    expect(result.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("does not consume the cooldown when delivery fails", async () => {
    mockDb.where.mockResolvedValueOnce([candidate]);
    mockSendEmail.mockResolvedValueOnce({
      success: false,
      status: "failed",
      error: "provider unavailable",
      retryable: true,
    });

    const result = await runInactiveComeback();

    expect(result).toEqual({
      sent: 0,
      suppressed: 0,
      skipped: 0,
      failed: 1,
    });
    expect(mockDb.set).toHaveBeenCalledTimes(1);
    expect(mockDb.set).toHaveBeenLastCalledWith(
      expect.objectContaining({
        marketingCampaignClaimType: "inactive-comeback",
        marketingCampaignClaimStartedAt: now,
        marketingCampaignClaimPayload: expect.objectContaining({
          idempotencyKey: "inactive-comeback/user-1/initial",
        }),
      })
    );
  });

  it("does not send when another invocation wins the atomic claim", async () => {
    mockDb.where.mockResolvedValueOnce([candidate]);
    mockDb.returning.mockResolvedValueOnce([]);

    const result = await runInactiveComeback();

    expect(result.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("releases the claim for a suppressed recipient", async () => {
    mockDb.where.mockResolvedValueOnce([candidate]);
    mockSendEmail.mockResolvedValueOnce({
      success: true,
      status: "suppressed",
    });

    const result = await runInactiveComeback();

    expect(result).toEqual({
      sent: 0,
      suppressed: 1,
      skipped: 0,
      failed: 0,
    });
    expect(mockDb.set).toHaveBeenLastCalledWith({
      marketingCampaignClaimToken: null,
      marketingCampaignClaimedAt: null,
      marketingCampaignClaimStartedAt: null,
      marketingCampaignClaimType: null,
      marketingCampaignClaimPayload: null,
      updatedAt: now,
    });
  });

  it("does not send while another invocation has an active lease", async () => {
    mockDb.where.mockResolvedValueOnce([
      {
        ...candidate,
        marketingCampaignClaimedAt: new Date("2026-07-14T11:50:00Z"),
        marketingCampaignClaimStartedAt: new Date("2026-07-14T11:45:00Z"),
        marketingCampaignClaimType: "inactive-comeback",
        marketingCampaignClaimPayload: storedComebackPayload,
      },
    ]);

    const result = await runInactiveComeback();

    expect(result.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockDb.set).not.toHaveBeenCalled();
  });

  it("does not recover a comeback after the recipient becomes active", async () => {
    mockDb.where.mockResolvedValueOnce([
      {
        ...candidate,
        email: "changed@example.com",
        lastActiveAt: new Date("2026-07-14T11:30:00Z"),
        marketingCampaignClaimedAt: new Date("2026-07-14T11:00:00Z"),
        marketingCampaignClaimStartedAt: new Date("2026-07-14T10:00:00Z"),
        marketingCampaignClaimType: "inactive-comeback",
        marketingCampaignClaimPayload: storedComebackPayload,
      },
    ]);

    const result = await runInactiveComeback({ recoveryOnly: true });

    expect(result.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("retries an eligible stale comeback with its original payload", async () => {
    mockDb.where.mockResolvedValueOnce([
      {
        ...candidate,
        email: "changed@example.com",
        marketingCampaignClaimedAt: new Date("2026-07-14T11:00:00Z"),
        marketingCampaignClaimStartedAt: new Date("2026-07-14T10:00:00Z"),
        marketingCampaignClaimType: "inactive-comeback",
        marketingCampaignClaimPayload: storedComebackPayload,
      },
    ]);

    const result = await runInactiveComeback({ recoveryOnly: true });

    expect(result.sent).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledWith(storedComebackPayload);
  });

  it("does not start a new campaign send during a recovery-only run", async () => {
    mockDb.where.mockResolvedValueOnce([candidate]);

    const result = await runInactiveComeback({ recoveryOnly: true });

    expect(result.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("does not recover a stale claim belonging to the upgrade campaign", async () => {
    mockDb.where.mockResolvedValueOnce([
      {
        ...candidate,
        marketingCampaignClaimedAt: new Date("2026-07-14T11:00:00Z"),
        marketingCampaignClaimStartedAt: new Date("2026-07-14T10:00:00Z"),
        marketingCampaignClaimType: "upgrade-reminder",
        marketingCampaignClaimPayload: {
          ...storedComebackPayload,
          subject: "Unlock more with Vernix Pro",
          idempotencyKey: "upgrade-reminder/user-1/initial",
        },
      },
    ]);

    const result = await runInactiveComeback({ recoveryOnly: true });

    expect(result.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("does not recover after the provider idempotency window expires", async () => {
    mockDb.where.mockResolvedValueOnce([
      {
        ...candidate,
        marketingCampaignClaimedAt: new Date("2026-07-14T11:00:00Z"),
        marketingCampaignClaimStartedAt: new Date("2026-07-13T12:00:00Z"),
        marketingCampaignClaimType: "inactive-comeback",
        marketingCampaignClaimPayload: storedComebackPayload,
      },
    ]);

    const result = await runInactiveComeback({ recoveryOnly: true });

    expect(result.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("starts a fresh attempt after an unresolved claim leaves recovery", async () => {
    mockDb.where.mockResolvedValueOnce([
      {
        ...candidate,
        marketingCampaignClaimedAt: new Date("2026-07-13T12:00:00Z"),
        marketingCampaignClaimStartedAt: new Date("2026-07-13T12:00:00Z"),
        marketingCampaignClaimType: "inactive-comeback",
        marketingCampaignClaimPayload: storedComebackPayload,
      },
    ]);

    const result = await runInactiveComeback();

    expect(result.sent).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: candidate.email })
    );
    expect(mockDb.set).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        marketingCampaignClaimStartedAt: now,
        marketingCampaignClaimType: "inactive-comeback",
      })
    );
  });

  it("atomically rechecks recovery eligibility and marketing preference", async () => {
    mockDb.where.mockResolvedValueOnce([
      {
        ...candidate,
        marketingCampaignClaimedAt: new Date("2026-07-14T11:00:00Z"),
        marketingCampaignClaimStartedAt: new Date("2026-07-14T10:00:00Z"),
        marketingCampaignClaimType: "inactive-comeback",
        marketingCampaignClaimPayload: storedComebackPayload,
      },
    ]);
    mockDb.returning.mockResolvedValueOnce([]);

    const result = await runInactiveComeback({ recoveryOnly: true });

    const claimSql = new PgDialect().sqlToQuery(
      mockDb.where.mock.calls[1][0]
    ).sql;
    expect(claimSql).toContain('"users"."plan" =');
    expect(claimSql).toContain('"users"."last_active_at"');
    expect(claimSql).toContain(
      "\"users\".\"email_preferences\"->>'marketing' IS DISTINCT FROM 'false'"
    );
    expect(result.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("does not recover after the user opts out", async () => {
    mockDb.where.mockResolvedValueOnce([
      {
        ...candidate,
        emailPreferences: { marketing: false },
        marketingCampaignClaimedAt: new Date("2026-07-14T11:00:00Z"),
        marketingCampaignClaimStartedAt: new Date("2026-07-14T10:00:00Z"),
        marketingCampaignClaimType: "inactive-comeback",
        marketingCampaignClaimPayload: storedComebackPayload,
      },
    ]);

    const result = await runInactiveComeback({ recoveryOnly: true });

    expect(result.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("releases a definitive provider rejection for a later weekly attempt", async () => {
    mockDb.where.mockResolvedValueOnce([candidate]);
    mockSendEmail.mockResolvedValueOnce({
      success: false,
      status: "failed",
      error: "invalid request",
      retryable: false,
    });

    const result = await runInactiveComeback();

    expect(result.failed).toBe(1);
    expect(mockDb.set).toHaveBeenLastCalledWith({
      marketingCampaignClaimToken: null,
      marketingCampaignClaimedAt: null,
      marketingCampaignClaimStartedAt: null,
      marketingCampaignClaimType: null,
      marketingCampaignClaimPayload: null,
      updatedAt: now,
    });
  });

  it("does not count a send when the cooldown write loses claim ownership", async () => {
    mockDb.where.mockResolvedValueOnce([candidate]);
    mockDb.returning
      .mockResolvedValueOnce([{ id: candidate.id }])
      .mockResolvedValueOnce([]);

    const result = await runInactiveComeback();

    expect(result).toEqual({
      sent: 0,
      suppressed: 0,
      skipped: 0,
      failed: 1,
    });
  });
});
