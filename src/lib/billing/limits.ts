import type { Plan } from "./constants";
import { LIMITS, TRIAL_LIMITS, PLANS } from "./constants";

// ---------------------------------------------------------------------------
// Resolve effective limits based on plan + trial status
// ---------------------------------------------------------------------------

export interface EffectiveLimits {
  meetingMinutesPerMonth: number | null;
  voiceMeetingsPerMonth: number | null;
  documentsCount: number | null;
  maxDocumentSizeMB: number | null;
  docUploadsPerMonth: number | null;
  totalStorageMB: number | null;
  ragQueriesPerDay: number | null;
  meetingScopedDocs: number | null;
  concurrentMeetings: number | null;
  meetingsPerMonth: number | null;
  apiEnabled: boolean;
  mcpEnabled: boolean;
  apiRequestsPerDay: number | null;
  mcpServerConnections: number | null;
  mcpClientConnections: number | null;
}

export const ADMIN_LIMITS: EffectiveLimits = {
  meetingMinutesPerMonth: null,
  voiceMeetingsPerMonth: null,
  documentsCount: null,
  maxDocumentSizeMB: null,
  docUploadsPerMonth: null,
  totalStorageMB: null,
  ragQueriesPerDay: null,
  meetingScopedDocs: null,
  concurrentMeetings: null,
  meetingsPerMonth: null,
  apiEnabled: true,
  mcpEnabled: true,
  apiRequestsPerDay: null,
  mcpServerConnections: null,
  mcpClientConnections: null,
};

export function getEffectiveLimits(
  plan: Plan,
  trialEndsAt: Date | null
): EffectiveLimits {
  const isTrialing =
    plan === PLANS.FREE && trialEndsAt && trialEndsAt > new Date();

  if (isTrialing) return TRIAL_LIMITS;
  return LIMITS[plan];
}

export function isTrialActive(plan: Plan, trialEndsAt: Date | null): boolean {
  return plan === PLANS.FREE && !!trialEndsAt && trialEndsAt > new Date();
}

export function getTrialDaysRemaining(trialEndsAt: Date | null): number {
  if (!trialEndsAt) return 0;
  const diff = trialEndsAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ---------------------------------------------------------------------------
// Check specific limits
// ---------------------------------------------------------------------------

export interface LimitCheck {
  allowed: boolean;
  reason?: string;
}

export function canStartMeeting(
  limits: EffectiveLimits,
  isVoice: boolean,
  usedMinutes: number,
  activeMeetings: number,
  monthlyMeetingCount: number,
  monthlyVoiceMeetingCount: number
): LimitCheck {
  if (
    isVoice &&
    limits.voiceMeetingsPerMonth !== null &&
    monthlyVoiceMeetingCount >= limits.voiceMeetingsPerMonth
  ) {
    return { allowed: false, reason: "Monthly voice meeting limit reached" };
  }

  if (
    limits.concurrentMeetings !== null &&
    activeMeetings >= limits.concurrentMeetings
  ) {
    return {
      allowed: false,
      reason: `Maximum ${limits.concurrentMeetings} concurrent meeting${limits.concurrentMeetings === 1 ? "" : "s"}`,
    };
  }

  if (
    limits.meetingsPerMonth !== null &&
    monthlyMeetingCount >= limits.meetingsPerMonth
  ) {
    return { allowed: false, reason: "Monthly meeting limit reached" };
  }

  // Free plan: hard minute cap
  if (
    limits.meetingMinutesPerMonth !== null &&
    usedMinutes >= limits.meetingMinutesPerMonth
  ) {
    return { allowed: false, reason: "Monthly meeting minutes exhausted" };
  }

  return { allowed: true };
}

export function canUploadDocument(
  limits: EffectiveLimits,
  currentDocCount: number,
  monthlyUploads: number,
  currentStorageMB: number,
  fileSizeMB: number
): LimitCheck {
  if (
    limits.documentsCount !== null &&
    currentDocCount >= limits.documentsCount
  ) {
    return {
      allowed: false,
      reason: `Maximum ${limits.documentsCount} documents`,
    };
  }

  if (
    limits.docUploadsPerMonth !== null &&
    monthlyUploads >= limits.docUploadsPerMonth
  ) {
    return { allowed: false, reason: "Monthly upload limit reached" };
  }

  if (
    limits.maxDocumentSizeMB !== null &&
    fileSizeMB > limits.maxDocumentSizeMB
  ) {
    return {
      allowed: false,
      reason: `File exceeds ${limits.maxDocumentSizeMB}MB limit`,
    };
  }

  if (
    limits.totalStorageMB !== null &&
    currentStorageMB + fileSizeMB > limits.totalStorageMB
  ) {
    return { allowed: false, reason: "Storage limit reached" };
  }

  return { allowed: true };
}

export function canMakeRagQuery(
  limits: EffectiveLimits,
  dailyCount: number
): LimitCheck {
  if (
    limits.ragQueriesPerDay !== null &&
    dailyCount >= limits.ragQueriesPerDay
  ) {
    return { allowed: false, reason: "Daily RAG query limit reached" };
  }
  return { allowed: true };
}

export function canMakeApiRequest(
  limits: EffectiveLimits,
  dailyCount: number
): LimitCheck {
  if (!limits.apiEnabled) {
    return { allowed: false, reason: "API access requires a Pro plan" };
  }
  if (
    limits.apiRequestsPerDay !== null &&
    dailyCount >= limits.apiRequestsPerDay
  ) {
    return { allowed: false, reason: "Daily API request limit reached" };
  }
  return { allowed: true };
}

export function canAddMcpServer(
  limits: EffectiveLimits,
  currentEnabledCount: number
): LimitCheck {
  if (!limits.mcpEnabled) {
    return { allowed: false, reason: "Integrations require a Pro plan" };
  }
  if (
    limits.mcpServerConnections !== null &&
    currentEnabledCount >= limits.mcpServerConnections
  ) {
    return {
      allowed: false,
      reason: `Maximum ${limits.mcpServerConnections} integration${limits.mcpServerConnections === 1 ? "" : "s"} on your plan`,
    };
  }
  return { allowed: true };
}
