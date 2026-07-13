import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockDb, mockSendEmail } = vi.hoisted(() => {
  const db: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ["select", "from", "where", "update", "set"]) {
    db[method] = vi.fn().mockImplementation(() => db);
  }
  return {
    mockDb: db,
    mockSendEmail: vi.fn().mockResolvedValue({ success: true }),
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
};

describe("runUpgradeReminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    process.env.AUTH_SECRET = "campaign-test-secret";
    mockSendEmail.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends to an active user and records the successful send", async () => {
    mockDb.where.mockResolvedValueOnce([candidate]);

    const result = await runUpgradeReminders();

    expect(result).toEqual({ sent: 1, failed: 0 });
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: candidate.email,
        subject: "Unlock more with Vernix Pro",
        unsubscribeUrl: expect.stringContaining("category=marketing"),
      })
    );
    expect(mockDb.set).toHaveBeenCalledWith({
      lastUpgradeReminderSentAt: now,
      updatedAt: now,
    });
  });

  it.each([
    ["inactive", new Date("2026-03-01T00:00:00Z")],
    ["in the quiet gap", new Date("2026-06-01T00:00:00Z")],
  ])("does not send to a user who is %s", async (_, lastActiveAt) => {
    mockDb.where.mockResolvedValueOnce([{ ...candidate, lastActiveAt }]);

    const result = await runUpgradeReminders();

    expect(result).toEqual({ sent: 0, failed: 0 });
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
      error: "provider unavailable",
    });

    const result = await runUpgradeReminders();

    expect(result).toEqual({ sent: 0, failed: 1 });
    expect(mockDb.set).not.toHaveBeenCalled();
  });
});
