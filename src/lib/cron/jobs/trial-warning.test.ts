import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockDb,
  mockSendEmail,
  mockGetTrialWarningHtml,
  mockShouldSendEmail,
  mockBuildUnsubscribeUrl,
} = vi.hoisted(() => {
  const db: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of [
    "select",
    "from",
    "where",
    "orderBy",
    "insert",
    "values",
    "returning",
    "update",
    "set",
    "delete",
    "limit",
  ]) {
    db[m] = vi.fn().mockImplementation(() => db);
  }
  return {
    mockDb: db,
    mockSendEmail: vi.fn().mockResolvedValue({ success: true }),
    mockGetTrialWarningHtml: vi
      .fn()
      .mockReturnValue("<html>trial warning</html>"),
    mockShouldSendEmail: vi.fn().mockReturnValue(true),
    mockBuildUnsubscribeUrl: vi
      .fn()
      .mockReturnValue("https://vernix.app/api/email/unsubscribe?token=abc"),
  };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/email/send", () => ({ sendEmail: mockSendEmail }));
vi.mock("@/lib/email/templates", () => ({
  getTrialWarningHtml: mockGetTrialWarningHtml,
}));
vi.mock("@/lib/email/preferences", () => ({
  shouldSendEmail: mockShouldSendEmail,
  buildUnsubscribeUrl: mockBuildUnsubscribeUrl,
}));

import { runTrialWarning } from "./trial-warning";

describe("runTrialWarning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeUser(overrides: Record<string, unknown> = {}) {
    const now = new Date();
    return {
      id: "user-1",
      name: "Alice",
      email: "alice@example.com",
      emailPreferences: null,
      trialEndsAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      trialWarningEmailSentAt: null,
      ...overrides,
    };
  }

  it("sends warning when trial ends in 3 days and no previous warning sent", async () => {
    const user = makeUser();
    mockDb.where.mockResolvedValueOnce([user]);

    const result = await runTrialWarning();

    expect(result.sent).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "alice@example.com",
        subject: expect.stringContaining("trial ends in"),
        html: "<html>trial warning</html>",
        unsubscribeUrl: "https://vernix.app/api/email/unsubscribe?token=abc",
      })
    );
    // Verify DB was updated with trialWarningEmailSentAt
    expect(mockDb.update).toHaveBeenCalled();
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({
        trialWarningEmailSentAt: expect.any(Date),
        updatedAt: expect.any(Date),
      })
    );
  });

  it("sends second warning when previous was sent >2 days ago", async () => {
    const now = new Date();
    const user = makeUser({
      trialWarningEmailSentAt: new Date(
        now.getTime() - 3 * 24 * 60 * 60 * 1000
      ),
    });
    // The DB query already filters for lt(trialWarningEmailSentAt, twoDaysAgo),
    // so returning this user means it passed the filter
    mockDb.where.mockResolvedValueOnce([user]);

    const result = await runTrialWarning();

    expect(result.sent).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  it("skips when user has opted out of product emails", async () => {
    const user = makeUser({ emailPreferences: { product: false } });
    mockDb.where.mockResolvedValueOnce([user]);
    mockShouldSendEmail.mockReturnValueOnce(false);

    const result = await runTrialWarning();

    expect(result.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
    // shouldSendEmail was called with the user's preferences and "product"
    expect(mockShouldSendEmail).toHaveBeenCalledWith(
      { product: false },
      "product"
    );
  });

  it("returns count of sent emails", async () => {
    const users = [
      makeUser({ id: "user-1", email: "a@example.com" }),
      makeUser({ id: "user-2", email: "b@example.com" }),
      makeUser({ id: "user-3", email: "c@example.com" }),
    ];
    mockDb.where.mockResolvedValueOnce(users);

    const result = await runTrialWarning();

    expect(result.sent).toBe(3);
    expect(mockSendEmail).toHaveBeenCalledTimes(3);
  });

  it("skips users not on free plan (filtered by DB query)", async () => {
    // The DB query filters eq(users.plan, PLANS.FREE), so pro users
    // never appear in the result set. An empty result means zero sends.
    mockDb.where.mockResolvedValueOnce([]);

    const result = await runTrialWarning();

    expect(result.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("returns zero sent when no eligible users found", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    const result = await runTrialWarning();

    expect(result.sent).toBe(0);
  });

  it("calls getTrialWarningHtml with correct parameters", async () => {
    const user = makeUser();
    mockDb.where.mockResolvedValueOnce([user]);

    await runTrialWarning();

    expect(mockGetTrialWarningHtml).toHaveBeenCalledWith(
      "Alice",
      expect.any(Number),
      "https://vernix.app/api/email/unsubscribe?token=abc"
    );
  });

  it("builds unsubscribe URL with user id and product category", async () => {
    const user = makeUser();
    mockDb.where.mockResolvedValueOnce([user]);

    await runTrialWarning();

    expect(mockBuildUnsubscribeUrl).toHaveBeenCalledWith("user-1", "product");
  });
});
