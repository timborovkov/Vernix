import { describe, it, expect, vi, beforeEach } from "vitest";

vi.unmock("@/lib/billing/sync");
vi.unmock("@/lib/billing/constants");

const { mockDb, mockGetState } = vi.hoisted(() => {
  const db: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ["select", "from", "where", "update", "set"]) {
    db[m] = vi.fn().mockImplementation(() => db);
  }
  const mockGetState = vi.fn();
  return { mockDb: db, mockGetState };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/polar", () => ({
  isPolarEnabled: vi.fn().mockReturnValue(true),
  getPolar: vi.fn().mockReturnValue({
    customers: { getState: mockGetState },
  }),
}));

import { syncBillingFromPolar } from "./sync";

const USER_ID = "user-123";
const POLAR_CUSTOMER_ID = "polar_cust_456";

beforeEach(() => {
  vi.clearAllMocks();
  // Default: user has a Polar customer ID
  mockDb.where.mockResolvedValue([
    { polarCustomerId: POLAR_CUSTOMER_ID, plan: "free" },
  ]);
});

describe("syncBillingFromPolar", () => {
  it("clears trialEndsAt and sets free when Polar has no active subscription", async () => {
    mockGetState.mockResolvedValueOnce({
      activeSubscriptions: [],
    });

    await syncBillingFromPolar(USER_ID);

    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: "free",
        polarSubscriptionId: null,
        trialEndsAt: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
      })
    );
  });

  it("keeps plan free and sets trialEndsAt when Polar subscription is trialing", async () => {
    const trialEnd = new Date("2026-04-15T00:00:00Z");
    mockGetState.mockResolvedValueOnce({
      activeSubscriptions: [
        {
          id: "sub_123",
          status: "trialing",
          trialEnd,
          currentPeriodStart: new Date("2026-03-28"),
          currentPeriodEnd: new Date("2026-04-28"),
        },
      ],
    });

    await syncBillingFromPolar(USER_ID);

    const setCall = mockDb.set.mock.calls[0][0];
    expect(setCall.plan).toBe("free");
    expect(setCall.trialEndsAt).toEqual(trialEnd);
    expect(setCall.polarSubscriptionId).toBe("sub_123");
  });

  it("sets plan to pro when Polar subscription is active", async () => {
    mockGetState.mockResolvedValueOnce({
      activeSubscriptions: [
        {
          id: "sub_123",
          status: "active",
          trialEnd: null,
          currentPeriodStart: new Date("2026-03-28"),
          currentPeriodEnd: new Date("2026-04-28"),
        },
      ],
    });

    await syncBillingFromPolar(USER_ID);

    const setCall = mockDb.set.mock.calls[0][0];
    expect(setCall.plan).toBe("pro");
    expect(setCall.polarSubscriptionId).toBe("sub_123");
  });

  it("handles past_due as active (still has access)", async () => {
    mockGetState.mockResolvedValueOnce({
      activeSubscriptions: [
        {
          id: "sub_123",
          status: "past_due",
          trialEnd: null,
          currentPeriodStart: new Date("2026-03-28"),
          currentPeriodEnd: new Date("2026-04-28"),
        },
      ],
    });

    await syncBillingFromPolar(USER_ID);

    const setCall = mockDb.set.mock.calls[0][0];
    expect(setCall.plan).toBe("pro");
  });

  it("skips sync when user has no polarCustomerId", async () => {
    mockDb.where.mockResolvedValueOnce([
      { polarCustomerId: null, plan: "free" },
    ]);

    await syncBillingFromPolar(USER_ID);

    expect(mockGetState).not.toHaveBeenCalled();
  });

  it("does not crash when Polar API fails", async () => {
    mockGetState.mockRejectedValueOnce(new Error("Polar unreachable"));

    const result = await syncBillingFromPolar(USER_ID);
    expect(result.synced).toBe(false);
  });

  it("skips sync when Polar is not enabled", async () => {
    const { isPolarEnabled } = await import("@/lib/polar");
    vi.mocked(isPolarEnabled).mockReturnValueOnce(false);

    await syncBillingFromPolar(USER_ID);

    expect(mockDb.select).not.toHaveBeenCalled();
    expect(mockGetState).not.toHaveBeenCalled();
  });
});
