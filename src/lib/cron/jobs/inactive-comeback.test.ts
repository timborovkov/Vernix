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

import { runInactiveComeback } from "./inactive-comeback";

const now = new Date("2026-07-14T12:00:00Z");
const candidate = {
  id: "user-1",
  email: "inactive@example.com",
  name: "Inactive User",
  emailPreferences: {},
  createdAt: new Date("2025-01-01T00:00:00Z"),
  lastActiveAt: null,
  lastUpgradeReminderSentAt: null,
  lastComeBackEmailSentAt: null,
};

describe("runInactiveComeback", () => {
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

  it("sends to an old account with no recorded activity and records success", async () => {
    mockDb.where.mockResolvedValueOnce([candidate]);

    const result = await runInactiveComeback();

    expect(result).toEqual({ sent: 1, failed: 0 });
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: candidate.email,
        subject: "Come back to Vernix",
        unsubscribeUrl: expect.stringContaining("category=marketing"),
      })
    );
    expect(mockDb.set).toHaveBeenCalledWith({
      lastComeBackEmailSentAt: now,
      updatedAt: now,
    });
  });

  it("does not send to an active user", async () => {
    mockDb.where.mockResolvedValueOnce([
      { ...candidate, lastActiveAt: new Date("2026-07-01T00:00:00Z") },
    ]);

    const result = await runInactiveComeback();

    expect(result).toEqual({ sent: 0, failed: 0 });
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
      error: "provider unavailable",
    });

    const result = await runInactiveComeback();

    expect(result).toEqual({ sent: 0, failed: 1 });
    expect(mockDb.set).not.toHaveBeenCalled();
  });
});
