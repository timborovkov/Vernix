import { vi, afterEach } from "vitest";

vi.stubEnv("DATABASE_URL", "postgres://fake:fake@localhost:5432/fake");
vi.stubEnv("QDRANT_URL", "http://localhost:6333");
vi.stubEnv("OPENAI_API_KEY", "sk-fake-key");
vi.stubEnv("MEETING_BOT_PROVIDER", "mock");
vi.stubEnv("AUTH_SECRET", "test-secret-for-vitest");

// Mock auth session for all route tests
vi.mock("@/lib/auth/session", () => ({
  getSessionUser: vi.fn().mockResolvedValue({
    id: "b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22",
    email: "test@example.com",
  }),
  requireSessionUser: vi.fn().mockResolvedValue({
    id: "b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22",
    email: "test@example.com",
  }),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: {
      id: "b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22",
      email: "test@example.com",
    },
  }),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: { GET: vi.fn(), POST: vi.fn() },
}));

// Mock billing enforcement — all routes pass billing checks by default in tests
const { mockBillingError } = vi.hoisted(() => {
  const { NextResponse } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("next/server") as typeof import("next/server");
  return {
    mockBillingError: (check: { reason?: string }, status: number = 403) =>
      NextResponse.json(
        {
          error: check.reason,
          code: status === 429 ? "RATE_LIMITED" : "BILLING_LIMIT",
        },
        { status }
      ),
  };
});

vi.mock("@/lib/billing/enforce", () => ({
  getUserBilling: vi.fn().mockResolvedValue({
    plan: "free",
    trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    currentPeriodStart: null,
    currentPeriodEnd: null,
  }),
  requireLimits: vi.fn().mockResolvedValue({
    limits: {
      meetingMinutesPerMonth: null,
      voiceEnabled: true,
      documentsCount: 200,
      maxDocumentSizeMB: 25,
      docUploadsPerMonth: 50,
      totalStorageMB: 500,
      ragQueriesPerDay: 200,
      meetingScopedDocs: 10,
      concurrentMeetings: 5,
      meetingsPerMonth: 500,
      apiEnabled: true,
      mcpEnabled: true,
      apiRequestsPerDay: 1000,
      mcpServerConnections: 5,
      mcpClientConnections: 10,
    },
    period: {
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
    },
    plan: "free",
  }),
  billingError: vi.fn().mockImplementation(mockBillingError),
}));

vi.mock("@/lib/billing/usage", () => ({
  getDailyCount: vi.fn().mockResolvedValue(0),
  getActiveMeetingCount: vi.fn().mockResolvedValue(0),
  getUsedMinutes: vi.fn().mockResolvedValue(0),
  getMonthlyMeetingCount: vi.fn().mockResolvedValue(0),
  getDocumentCount: vi.fn().mockResolvedValue(0),
  getMonthlyDocUploads: vi.fn().mockResolvedValue(0),
  getTotalStorageMB: vi.fn().mockResolvedValue(0),
  recordUsageEvent: vi.fn().mockResolvedValue(undefined),
  recordMeetingUsage: vi.fn().mockResolvedValue(undefined),
  syncUsageToPolar: vi.fn().mockResolvedValue(undefined),
  getUsageSummary: vi.fn().mockResolvedValue({
    voiceMinutes: 0,
    silentMinutes: 0,
    totalCostEur: 0,
    creditEur: 0,
    overageEur: 0,
    ragQueries: 0,
    apiRequests: 0,
    docUploads: 0,
  }),
  getEffectivePeriod: vi.fn().mockReturnValue({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
  }),
}));

vi.mock("@/lib/billing/limits", () => ({
  getEffectiveLimits: vi.fn().mockReturnValue({
    meetingMinutesPerMonth: null,
    voiceEnabled: true,
    documentsCount: 200,
    maxDocumentSizeMB: 25,
    docUploadsPerMonth: 50,
    totalStorageMB: 500,
    ragQueriesPerDay: 200,
    meetingScopedDocs: 10,
    concurrentMeetings: 5,
    meetingsPerMonth: 500,
    apiEnabled: true,
    mcpEnabled: true,
    apiRequestsPerDay: 1000,
    mcpServerConnections: 5,
    mcpClientConnections: 10,
  }),
  isTrialActive: vi.fn().mockReturnValue(true),
  getTrialDaysRemaining: vi.fn().mockReturnValue(14),
  canStartMeeting: vi.fn().mockReturnValue({ allowed: true }),
  canUploadDocument: vi.fn().mockReturnValue({ allowed: true }),
  canMakeRagQuery: vi.fn().mockReturnValue({ allowed: true }),
  canMakeApiRequest: vi.fn().mockReturnValue({ allowed: true }),
}));

afterEach(() => {
  vi.clearAllMocks();
});
