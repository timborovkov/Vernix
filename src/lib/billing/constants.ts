// ---------------------------------------------------------------------------
// Billing constants — single source of truth for plans, pricing, and limits.
// Used by billing logic, API enforcement, pricing page, and settings UI.
// ---------------------------------------------------------------------------

export const PLANS = {
  FREE: "free",
  PRO: "pro",
} as const;

export type Plan = (typeof PLANS)[keyof typeof PLANS];

/** Prices in EUR */
export const PRICING = {
  [PLANS.PRO]: {
    monthly: 29,
    annual: 288, // €24/month billed annually
  },
} as const;

/** Usage rates in EUR per hour */
export const USAGE_RATES = {
  voice: 3,
  silent: 1.5,
} as const;

/** Monthly usage credit included in each plan (EUR, does not roll over) */
export const MONTHLY_CREDIT = {
  [PLANS.FREE]: 0,
  [PLANS.PRO]: 30,
} as const;

/** Free trial settings */
export const FREE_TRIAL = {
  days: 14,
  totalMinutes: 90, // voice + silent combined
} as const;

/** Per-plan hard caps */
export const LIMITS = {
  [PLANS.FREE]: {
    meetingMinutesPerMonth: 30, // silent only
    voiceEnabled: false,
    documentsCount: 5,
    maxDocumentSizeMB: 10,
    docUploadsPerMonth: 5,
    totalStorageMB: 50,
    ragQueriesPerDay: 20,
    meetingScopedDocs: 1,
    concurrentMeetings: 1,
    meetingsPerMonth: 5,
    apiEnabled: false,
    mcpEnabled: false,
    apiRequestsPerDay: 0,
    mcpServerConnections: 0,
    mcpClientConnections: 0,
  },
  [PLANS.PRO]: {
    meetingMinutesPerMonth: null, // governed by credits
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
} as const;

/** Trial limits (same as Pro, capped at 90 total minutes) */
export const TRIAL_LIMITS = {
  ...LIMITS[PLANS.PRO],
  meetingMinutesPerMonth: FREE_TRIAL.totalMinutes,
} as const;
