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
    meetingMinutesPerMonth: 30, // voice + silent combined
    voiceMeetingsPerMonth: 1,
    documentsCount: 5,
    maxDocumentSizeMB: 10,
    docUploadsPerMonth: 5,
    totalStorageMB: 50,
    ragQueriesPerDay: 20,
    meetingScopedDocs: 1,
    concurrentMeetings: 1,
    meetingsPerMonth: 5,
    apiEnabled: false,
    mcpEnabled: true,
    apiRequestsPerDay: 0,
    mcpServerConnections: 1,
    mcpClientConnections: 0,
  },
  [PLANS.PRO]: {
    meetingMinutesPerMonth: null, // governed by credits
    voiceMeetingsPerMonth: null, // unlimited
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
    mcpServerConnections: null, // unlimited
    mcpClientConnections: null, // unlimited
  },
} as const;

/** Trial limits (same as Pro, capped at 90 total minutes) */
export const TRIAL_LIMITS = {
  ...LIMITS[PLANS.PRO],
  meetingMinutesPerMonth: FREE_TRIAL.totalMinutes,
} as const;

/** Format a number as EUR with trailing decimals only when needed (e.g. 1.5 → "1.50", 29 → "29") */
function eur(n: number): string {
  return Number.isInteger(n) ? `€${n}` : `€${n.toFixed(2)}`;
}

/** Pre-formatted display strings for UI — avoids scattering `€${...}` everywhere */
export const DISPLAY = {
  proMonthly: eur(PRICING[PLANS.PRO].monthly),
  proAnnual: eur(PRICING[PLANS.PRO].annual / 12),
  annualSavings: eur(
    PRICING[PLANS.PRO].monthly * 12 - PRICING[PLANS.PRO].annual
  ),
  voiceCost: eur(USAGE_RATES.voice),
  silentCost: eur(USAGE_RATES.silent),
  voiceRate: `${eur(USAGE_RATES.voice)}/hr`,
  silentRate: `${eur(USAGE_RATES.silent)}/hr`,
  monthlyCredit: eur(MONTHLY_CREDIT[PLANS.PRO]),
  freeVoiceMeetings: `${LIMITS[PLANS.FREE].voiceMeetingsPerMonth}`,
  trialDays: `${FREE_TRIAL.days}`,
  trialMinutes: `${FREE_TRIAL.totalMinutes}`,
  voiceHoursPerCredit: `${Math.floor(MONTHLY_CREDIT[PLANS.PRO] / USAGE_RATES.voice)}`,
  silentHoursPerCredit: `${Math.floor(MONTHLY_CREDIT[PLANS.PRO] / USAGE_RATES.silent)}`,
} as const;
