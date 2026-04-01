import { vi } from "vitest";

// Chainable DB mock
const { mockDb, mockSendEmail, mockLastChanceTemplate } = vi.hoisted(() => {
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
  ]) {
    db[m] = vi.fn().mockImplementation(() => db);
  }
  return {
    mockDb: db,
    mockSendEmail: vi.fn().mockResolvedValue({ success: true }),
    mockLastChanceTemplate: vi.fn().mockReturnValue("<html>retention</html>"),
  };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/email/send", () => ({ sendEmail: mockSendEmail }));
vi.mock("@/lib/email/templates", () => ({
  getLastChanceRetentionHtml: mockLastChanceTemplate,
  getTrialStartedEmailHtml: vi
    .fn()
    .mockReturnValue("<html>trial-started</html>"),
  getTrialExpiredEmailHtml: vi
    .fn()
    .mockReturnValue("<html>trial-expired</html>"),
}));
vi.mock("@/lib/email/preferences", () => ({
  shouldSendEmail: vi.fn().mockReturnValue(true),
  buildUnsubscribeUrl: vi
    .fn()
    .mockReturnValue("https://vernix.app/api/email/unsubscribe?test=1"),
}));

// Capture the handler callbacks passed to Webhooks() — must be hoisted
// since vi.mock is hoisted above const declarations
const { capturedHandlers } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const capturedHandlers: Record<string, (...args: any[]) => any> = {};
  return { capturedHandlers };
});

vi.mock("@polar-sh/nextjs", () => ({
  Webhooks: (config: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(config)) {
      if (key.startsWith("on") && typeof value === "function") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        capturedHandlers[key] = value as (...args: any[]) => any;
      }
    }
    return async () => new Response(JSON.stringify({ received: true }));
  },
}));

// Import after mocks — this triggers Webhooks() and captures handlers
import "./route";

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.where.mockImplementation(() => mockDb);
});

const USER_ID = "b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22";
const POLAR_CUSTOMER_ID = "polar_cust_123";
const SUBSCRIPTION_ID = "polar_sub_456";
const PERIOD_START = "2026-03-01T00:00:00Z";
const PERIOD_END = "2026-04-01T00:00:00Z";

const TRIAL_END = "2026-04-11T00:00:00Z";

function subscriptionPayload(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      id: SUBSCRIPTION_ID,
      customerId: POLAR_CUSTOMER_ID,
      customer: { externalId: USER_ID },
      currentPeriodStart: PERIOD_START,
      currentPeriodEnd: PERIOD_END,
      status: "active",
      trialStart: null,
      trialEnd: null,
      ...overrides,
    },
  };
}

describe("Polar webhook: onSubscriptionCreated", () => {
  it("sets plan to pro when subscription is active (no trial)", async () => {
    await capturedHandlers.onSubscriptionCreated(
      subscriptionPayload({ status: "active" })
    );

    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: "pro",
        polarCustomerId: POLAR_CUSTOMER_ID,
        polarSubscriptionId: SUBSCRIPTION_ID,
      })
    );
  });

  it("keeps plan free and sets trialEndsAt when subscription is trialing", async () => {
    // First where() call is the plan check (returns user with plan: free)
    // Subsequent where() calls are for the update
    mockDb.where
      .mockResolvedValueOnce([{ plan: "free" }])
      .mockImplementation(() => mockDb);

    await capturedHandlers.onSubscriptionCreated(
      subscriptionPayload({ status: "trialing", trialEnd: TRIAL_END })
    );

    const setCall = mockDb.set.mock.calls[0][0];
    expect(setCall.plan).toBeUndefined(); // plan not changed
    expect(setCall.trialEndsAt).toEqual(new Date(TRIAL_END));
    expect(setCall.polarCustomerId).toBe(POLAR_CUSTOMER_ID);
    expect(setCall.polarSubscriptionId).toBe(SUBSCRIPTION_ID);
  });

  it("stores billing period dates", async () => {
    await capturedHandlers.onSubscriptionCreated(subscriptionPayload());

    const setCall = mockDb.set.mock.calls[0][0];
    expect(setCall.currentPeriodStart).toEqual(new Date(PERIOD_START));
    expect(setCall.currentPeriodEnd).toEqual(new Date(PERIOD_END));
  });

  it("does not update DB when externalId is missing", async () => {
    const payload = {
      data: {
        id: SUBSCRIPTION_ID,
        customerId: POLAR_CUSTOMER_ID,
        customer: { externalId: null },
        currentPeriodStart: PERIOD_START,
        currentPeriodEnd: PERIOD_END,
        status: "active",
      },
    };

    await capturedHandlers.onSubscriptionCreated(payload);
    expect(mockDb.update).not.toHaveBeenCalled();
  });
});

describe("Polar webhook: onSubscriptionActive", () => {
  it("sets plan to pro when trial ends and payment succeeds", async () => {
    await capturedHandlers.onSubscriptionActive(subscriptionPayload());

    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: "pro",
        polarSubscriptionId: SUBSCRIPTION_ID,
      })
    );
  });

  it("skips when no externalId", async () => {
    await capturedHandlers.onSubscriptionActive({
      data: { ...subscriptionPayload().data, customer: {} },
    });
    expect(mockDb.update).not.toHaveBeenCalled();
  });
});

describe("Polar webhook: onSubscriptionUpdated", () => {
  it("updates period dates without changing plan", async () => {
    const newEnd = "2026-05-01T00:00:00Z";
    await capturedHandlers.onSubscriptionUpdated(
      subscriptionPayload({ currentPeriodEnd: newEnd })
    );

    const setCall = mockDb.set.mock.calls[0][0];
    expect(setCall.currentPeriodEnd).toEqual(new Date(newEnd));
    // Should NOT set plan — subscription.updated doesn't change plan status
    expect(setCall.plan).toBeUndefined();
  });
});

describe("Polar webhook: onSubscriptionCanceled", () => {
  it("sends one retention email and does not downgrade plan", async () => {
    mockDb.where
      .mockResolvedValueOnce([
        {
          email: "user@example.com",
          name: "Test User",
          lastRetentionEmailSentAt: null,
          emailPreferences: null,
        },
      ])
      .mockImplementation(() => mockDb);

    await capturedHandlers.onSubscriptionCanceled(subscriptionPayload());

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.com",
        subject: "Last chance to keep your Vernix Pro benefits",
      })
    );
    expect(mockLastChanceTemplate).toHaveBeenCalledWith(
      "Test User",
      new Date(PERIOD_END),
      expect.any(String)
    );

    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({
        lastRetentionEmailSentAt: expect.any(Date),
      })
    );

    const setCall = mockDb.set.mock.calls[0][0];
    expect(setCall.plan).toBeUndefined();
  });

  it("respects cooldown and skips sending duplicate retention email", async () => {
    mockDb.where.mockResolvedValueOnce([
      {
        email: "user@example.com",
        name: "Test User",
        lastRetentionEmailSentAt: new Date(),
        emailPreferences: null,
      },
    ]);

    await capturedHandlers.onSubscriptionCanceled(subscriptionPayload());

    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

describe("Polar webhook: onSubscriptionRevoked", () => {
  it("downgrades to free and clears subscription fields", async () => {
    // First where() = select user for email, then subsequent where() = update
    mockDb.where
      .mockResolvedValueOnce([
        {
          name: "Test User",
          email: "user@example.com",
          emailPreferences: null,
        },
      ])
      .mockImplementation(() => mockDb);

    await capturedHandlers.onSubscriptionRevoked(
      subscriptionPayload({ currentPeriodEnd: "2020-01-01T00:00:00Z" })
    );

    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: "free",
        polarSubscriptionId: null,
        trialEndsAt: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        churnedAt: expect.any(Date),
      })
    );
  });

  it("always downgrades even when period end is in the future", async () => {
    const futureEnd = new Date(Date.now() + 1000 * 60 * 60).toISOString();

    mockDb.where
      .mockResolvedValueOnce([
        {
          name: "Test User",
          email: "user@example.com",
          emailPreferences: null,
        },
      ])
      .mockImplementation(() => mockDb);

    await capturedHandlers.onSubscriptionRevoked(
      subscriptionPayload({ currentPeriodEnd: futureEnd })
    );

    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ plan: "free" })
    );
  });

  it("skips when no externalId", async () => {
    await capturedHandlers.onSubscriptionRevoked({
      data: { ...subscriptionPayload().data, customer: {} },
    });
    expect(mockDb.update).not.toHaveBeenCalled();
  });
});

describe("Polar webhook: onCustomerCreated", () => {
  it("stores polarCustomerId on user record", async () => {
    await capturedHandlers.onCustomerCreated({
      data: { id: POLAR_CUSTOMER_ID, externalId: USER_ID },
    });

    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({
        polarCustomerId: POLAR_CUSTOMER_ID,
      })
    );
  });

  it("skips when no externalId", async () => {
    await capturedHandlers.onCustomerCreated({
      data: { id: POLAR_CUSTOMER_ID, externalId: null },
    });
    expect(mockDb.update).not.toHaveBeenCalled();
  });
});
