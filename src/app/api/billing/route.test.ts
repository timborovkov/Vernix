import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockDb,
  mockRequireSessionUser,
  mockSyncBillingFromPolar,
  mockGetUsageSummary,
  mockGetEffectivePeriod,
  mockGetMonthlyVoiceMeetingCount,
  mockIsAdminUserEmail,
} = vi.hoisted(() => {
  const db = {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
  };

  db.select.mockReturnValue(db);
  db.from.mockReturnValue(db);

  return {
    mockDb: db,
    mockRequireSessionUser: vi.fn(),
    mockSyncBillingFromPolar: vi.fn(),
    mockGetUsageSummary: vi.fn(),
    mockGetEffectivePeriod: vi.fn(),
    mockGetMonthlyVoiceMeetingCount: vi.fn(),
    mockIsAdminUserEmail: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/auth/session", () => ({
  requireSessionUser: mockRequireSessionUser,
}));
vi.mock("@/lib/billing/sync", () => ({
  syncBillingFromPolar: mockSyncBillingFromPolar,
}));
vi.mock("@/lib/billing/admin", () => ({
  isAdminUserEmail: mockIsAdminUserEmail,
}));
vi.mock("@/lib/billing/usage", () => ({
  getUsageSummary: mockGetUsageSummary,
  getEffectivePeriod: mockGetEffectivePeriod,
  getMonthlyVoiceMeetingCount: mockGetMonthlyVoiceMeetingCount,
}));

import { ADMIN_LIMITS } from "@/lib/billing/limits";
import { GET } from "./route";

const period = {
  start: new Date("2026-06-01T00:00:00.000Z"),
  end: new Date("2026-07-01T00:00:00.000Z"),
};

const usage = {
  voiceMinutes: 0,
  silentMinutes: 0,
  voiceMeetingsUsed: 0,
  totalCostEur: 0,
  creditEur: 0,
  overageEur: 0,
  ragQueries: 0,
  apiRequests: 0,
  docUploads: 0,
};

describe("GET /api/billing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReturnValue(mockDb);
    mockDb.from.mockReturnValue(mockDb);
    mockRequireSessionUser.mockResolvedValue({
      id: "user-1",
      email: "admin@example.com",
    });
    mockSyncBillingFromPolar.mockResolvedValue({ synced: true });
    mockGetEffectivePeriod.mockReturnValue(period);
    mockGetUsageSummary.mockResolvedValue({ ...usage });
    mockGetMonthlyVoiceMeetingCount.mockResolvedValue(3);
  });

  it("returns pro plan, admin flag, and admin limits for admin users", async () => {
    mockIsAdminUserEmail.mockReturnValue(true);
    mockDb.where.mockResolvedValueOnce([
      {
        email: "admin@example.com",
        emailVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
        plan: "free",
        polarCustomerId: null,
        polarSubscriptionId: null,
        trialEndsAt: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
      },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockIsAdminUserEmail).toHaveBeenCalledWith("admin@example.com");
    expect(body.plan).toBe("pro");
    expect(body.isAdmin).toBe(true);
    expect(body.limits).toEqual(ADMIN_LIMITS);
    expect(body.hasSubscription).toBe(false);
    expect(body.hasPolarCustomer).toBe(false);
    expect(body.trialEndsAt).toBeNull();
  });

  it("does not return admin limits for an unverified allowlisted email", async () => {
    mockIsAdminUserEmail.mockReturnValue(true);
    mockDb.where.mockResolvedValueOnce([
      {
        email: "admin@example.com",
        emailVerifiedAt: null,
        plan: "free",
        polarCustomerId: null,
        polarSubscriptionId: null,
        trialEndsAt: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
      },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockIsAdminUserEmail).not.toHaveBeenCalled();
    expect(body.plan).toBe("free");
    expect(body.isAdmin).toBe(false);
    expect(body.limits).not.toEqual(ADMIN_LIMITS);
  });
});
