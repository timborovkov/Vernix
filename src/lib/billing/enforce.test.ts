import { beforeEach, describe, expect, it, vi } from "vitest";

vi.unmock("@/lib/billing/enforce");
vi.unmock("@/lib/billing/limits");
vi.unmock("@/lib/billing/constants");

const { mockDb, mockIsAdminUserEmail, mockGetEffectivePeriod } = vi.hoisted(
  () => {
    const db = {
      select: vi.fn(),
      from: vi.fn(),
      where: vi.fn(),
    };

    db.select.mockReturnValue(db);
    db.from.mockReturnValue(db);

    return {
      mockDb: db,
      mockIsAdminUserEmail: vi.fn(),
      mockGetEffectivePeriod: vi.fn(),
    };
  }
);

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/billing/admin", () => ({
  isAdminUserEmail: mockIsAdminUserEmail,
}));
vi.mock("@/lib/billing/usage", () => ({
  getEffectivePeriod: mockGetEffectivePeriod,
}));

import { LIMITS } from "./constants";
import { ADMIN_LIMITS } from "./limits";
import { requireLimits } from "./enforce";

const period = {
  start: new Date("2026-06-01T00:00:00.000Z"),
  end: new Date("2026-07-01T00:00:00.000Z"),
};

describe("requireLimits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReturnValue(mockDb);
    mockDb.from.mockReturnValue(mockDb);
    mockGetEffectivePeriod.mockReturnValue(period);
  });

  it("returns admin limits for an allowlisted free user", async () => {
    mockIsAdminUserEmail.mockReturnValue(true);
    mockDb.where.mockResolvedValueOnce([
      {
        email: "admin@example.com",
        emailVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
        plan: "free",
        trialEndsAt: null,
        polarSubscriptionId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
      },
    ]);

    const result = await requireLimits("user-1");

    expect(mockIsAdminUserEmail).toHaveBeenCalledWith("admin@example.com");
    expect(result).toEqual({
      limits: ADMIN_LIMITS,
      period,
      plan: "pro",
      isAdmin: true,
    });
  });

  it("does not grant admin limits to an unverified allowlisted email", async () => {
    mockIsAdminUserEmail.mockReturnValue(true);
    mockDb.where.mockResolvedValueOnce([
      {
        email: "admin@example.com",
        emailVerifiedAt: null,
        plan: "free",
        trialEndsAt: null,
        polarSubscriptionId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
      },
    ]);

    const result = await requireLimits("user-1");

    expect(mockIsAdminUserEmail).not.toHaveBeenCalled();
    expect(result).toEqual({
      limits: LIMITS.free,
      period,
      plan: "free",
      isAdmin: false,
    });
  });

  it("preserves normal free limits for a non-admin user", async () => {
    mockIsAdminUserEmail.mockReturnValue(false);
    mockDb.where.mockResolvedValueOnce([
      {
        email: "person@example.com",
        emailVerifiedAt: null,
        plan: "free",
        trialEndsAt: null,
        polarSubscriptionId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
      },
    ]);

    const result = await requireLimits("user-1");

    expect(result).toEqual({
      limits: LIMITS.free,
      period,
      plan: "free",
      isAdmin: false,
    });
  });
});
