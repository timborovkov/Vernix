import { resetRateLimits } from "@/lib/rate-limit";

const {
  mockAuthenticateApiKey,
  mockRequireLimits,
  mockGetDailyCount,
  mockRecordUsageEvent,
} = vi.hoisted(() => ({
  mockAuthenticateApiKey: vi.fn(),
  mockRequireLimits: vi.fn().mockResolvedValue({
    limits: { apiEnabled: true, apiRequestsPerDay: 1000 },
    period: { start: new Date(), end: new Date() },
  }),
  mockGetDailyCount: vi.fn().mockResolvedValue(0),
  mockRecordUsageEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/auth/api-key", () => ({
  authenticateApiKey: mockAuthenticateApiKey,
}));
vi.mock("@/lib/billing/enforce", () => ({
  requireLimits: mockRequireLimits,
}));
vi.mock("@/lib/billing/limits", () => ({
  canMakeApiRequest: vi.fn().mockReturnValue({ allowed: true }),
}));
vi.mock("@/lib/billing/usage", () => ({
  getDailyCount: mockGetDailyCount,
  recordUsageEvent: mockRecordUsageEvent,
}));

import { NextResponse } from "next/server";
import { withApiAuth } from "./middleware";

const testUser = { id: "user-1", email: "test@test.com", name: "Test" };

function makeRequest() {
  return new Request("http://localhost/api/v1/meetings", {
    headers: { Authorization: "Bearer kk_abc123" },
  });
}

const dummyContext = { params: Promise.resolve({}) };

describe("withApiAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimits();
  });

  it("returns 401 when API key is invalid", async () => {
    mockAuthenticateApiKey.mockResolvedValueOnce(null);

    const handler = vi.fn();
    const wrapped = withApiAuth(handler, { endpoint: "test" });
    const response = await wrapped(makeRequest(), dummyContext);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(handler).not.toHaveBeenCalled();
  });

  it("calls handler and sets headers on success", async () => {
    mockAuthenticateApiKey.mockResolvedValueOnce(testUser);

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withApiAuth(handler, { endpoint: "test" });
    const response = await wrapped(makeRequest(), dummyContext);

    expect(handler).toHaveBeenCalledWith(
      expect.any(Request),
      testUser,
      dummyContext
    );
    expect(response.headers.get("X-API-Version")).toBe("v1");
    expect(response.headers.get("X-RateLimit-Limit")).toBe("60");
    expect(response.headers.get("X-RateLimit-Remaining")).toBeDefined();
  });

  it("returns 429 when rate limit exceeded", async () => {
    mockAuthenticateApiKey.mockResolvedValue(testUser);

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    // Use a very low rate limit
    const wrapped = withApiAuth(handler, {
      endpoint: "rate-test",
      ratePerMinute: 2,
    });

    await wrapped(makeRequest(), dummyContext);
    await wrapped(makeRequest(), dummyContext);
    const response = await wrapped(makeRequest(), dummyContext);

    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error.code).toBe("RATE_LIMITED");
  });

  it("returns 403 when API is disabled for plan", async () => {
    mockAuthenticateApiKey.mockResolvedValueOnce(testUser);
    mockRequireLimits.mockResolvedValueOnce({
      limits: { apiEnabled: false, apiRequestsPerDay: 0 },
      period: { start: new Date(), end: new Date() },
    });

    const { canMakeApiRequest } = await import("@/lib/billing/limits");
    vi.mocked(canMakeApiRequest).mockReturnValueOnce({
      allowed: false,
      reason: "API access requires a Pro plan",
    });

    const handler = vi.fn();
    const wrapped = withApiAuth(handler, { endpoint: "billing-test" });
    const response = await wrapped(makeRequest(), dummyContext);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe("BILLING_LIMIT");
    expect(handler).not.toHaveBeenCalled();
  });

  it("skips billing when skipBilling is true", async () => {
    mockAuthenticateApiKey.mockResolvedValueOnce(testUser);

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withApiAuth(handler, {
      endpoint: "skip-billing",
      skipBilling: true,
    });
    await wrapped(makeRequest(), dummyContext);

    expect(mockRequireLimits).not.toHaveBeenCalled();
    expect(mockRecordUsageEvent).not.toHaveBeenCalled();
  });
});
