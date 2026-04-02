import { describe, it, expect, vi } from "vitest";

// Use real implementations, not the global mocks
vi.unmock("@/lib/billing/limits");
vi.unmock("@/lib/billing/constants");

import {
  getEffectiveLimits,
  isTrialActive,
  getTrialDaysRemaining,
  canStartMeeting,
  canUploadDocument,
  canMakeRagQuery,
  canMakeApiRequest,
  canAddMcpServer,
} from "./limits";
import { LIMITS, PLANS } from "./constants";

describe("getEffectiveLimits", () => {
  it("returns free limits for free plan with no trial", () => {
    const limits = getEffectiveLimits("free", null);

    expect(limits.voiceMeetingsPerMonth).toBe(1);
    expect(limits.meetingMinutesPerMonth).toBe(30);
    expect(limits.documentsCount).toBe(5);
    expect(limits.apiEnabled).toBe(false);
    expect(limits.mcpEnabled).toBe(true);
    expect(limits.mcpServerConnections).toBe(1);
  });

  it("returns trial limits for free plan with active trial", () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const limits = getEffectiveLimits("free", future);

    expect(limits.voiceMeetingsPerMonth).toBeNull(); // unlimited during trial
    expect(limits.meetingMinutesPerMonth).toBe(90); // 90-minute trial cap
    expect(limits.documentsCount).toBe(200);
    expect(limits.apiEnabled).toBe(true); // trial includes full Pro features
  });

  it("returns free limits when trial has expired", () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const limits = getEffectiveLimits("free", past);

    expect(limits.voiceMeetingsPerMonth).toBe(1);
    expect(limits.meetingMinutesPerMonth).toBe(30);
  });

  it("returns pro limits for pro plan regardless of trial", () => {
    const limits = getEffectiveLimits("pro", null);

    expect(limits.voiceMeetingsPerMonth).toBeNull();
    expect(limits.meetingMinutesPerMonth).toBeNull();
    expect(limits.apiEnabled).toBe(true);
    expect(limits.apiRequestsPerDay).toBe(1000);
  });
});

describe("isTrialActive", () => {
  it("returns false for null trialEndsAt", () => {
    expect(isTrialActive("free", null)).toBe(false);
  });

  it("returns true for free plan with future trialEndsAt", () => {
    expect(isTrialActive("free", new Date(Date.now() + 60_000))).toBe(true);
  });

  it("returns false for free plan with past trialEndsAt", () => {
    expect(isTrialActive("free", new Date(Date.now() - 60_000))).toBe(false);
  });

  it("returns false for pro plan even with future trialEndsAt", () => {
    expect(isTrialActive("pro", new Date(Date.now() + 60_000))).toBe(false);
  });
});

describe("getTrialDaysRemaining", () => {
  it("returns 0 for null", () => {
    expect(getTrialDaysRemaining(null)).toBe(0);
  });

  it("returns 0 for past date", () => {
    expect(getTrialDaysRemaining(new Date(Date.now() - 60_000))).toBe(0);
  });

  it("returns correct days for future date", () => {
    const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    expect(getTrialDaysRemaining(in3Days)).toBe(3);
  });
});

describe("canStartMeeting", () => {
  const freeLimits = LIMITS[PLANS.FREE];
  const proLimits = LIMITS[PLANS.PRO];

  it("allows first voice meeting on free plan", () => {
    const result = canStartMeeting(freeLimits, true, 0, 0, 0, 0);
    expect(result.allowed).toBe(true);
  });

  it("blocks second voice meeting on free plan", () => {
    const result = canStartMeeting(freeLimits, true, 0, 0, 1, 1);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("voice meeting limit");
  });

  it("allows silent meetings on free plan within limits", () => {
    const result = canStartMeeting(freeLimits, false, 0, 0, 0, 0);
    expect(result.allowed).toBe(true);
  });

  it("blocks when concurrent meeting limit reached", () => {
    const result = canStartMeeting(freeLimits, false, 0, 1, 0, 0);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("concurrent");
  });

  it("blocks when monthly meeting count reached", () => {
    const result = canStartMeeting(freeLimits, false, 0, 0, 5, 0);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Monthly meeting limit");
  });

  it("blocks when monthly minutes exhausted on free plan", () => {
    const result = canStartMeeting(freeLimits, false, 30, 0, 0, 0);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("minutes exhausted");
  });

  it("allows meeting when under minute limit", () => {
    const result = canStartMeeting(freeLimits, false, 29, 0, 0, 0);
    expect(result.allowed).toBe(true);
  });

  it("allows voice meetings on pro plan", () => {
    const result = canStartMeeting(proLimits, true, 0, 0, 0, 0);
    expect(result.allowed).toBe(true);
  });

  it("pro plan has no minute cap (null meetingMinutesPerMonth)", () => {
    const result = canStartMeeting(proLimits, true, 10000, 0, 0, 0);
    expect(result.allowed).toBe(true);
  });

  it("pro plan has no voice meeting cap", () => {
    const result = canStartMeeting(proLimits, true, 0, 0, 0, 100);
    expect(result.allowed).toBe(true);
  });

  it("pro plan allows up to 5 concurrent meetings", () => {
    expect(canStartMeeting(proLimits, true, 0, 4, 0, 0).allowed).toBe(true);
    expect(canStartMeeting(proLimits, true, 0, 5, 0, 0).allowed).toBe(false);
  });
});

describe("canUploadDocument", () => {
  const freeLimits = LIMITS[PLANS.FREE];

  it("blocks when document count reached", () => {
    const result = canUploadDocument(freeLimits, 5, 0, 0, 1);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("5 documents");
  });

  it("blocks when monthly uploads reached", () => {
    const result = canUploadDocument(freeLimits, 0, 5, 0, 1);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("upload limit");
  });

  it("blocks when file exceeds size limit", () => {
    const result = canUploadDocument(freeLimits, 0, 0, 0, 11);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("10MB");
  });

  it("blocks when storage limit would be exceeded", () => {
    const result = canUploadDocument(freeLimits, 0, 0, 49, 2);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Storage limit");
  });

  it("allows upload within all limits", () => {
    const result = canUploadDocument(freeLimits, 3, 2, 20, 5);
    expect(result.allowed).toBe(true);
  });
});

describe("canMakeRagQuery", () => {
  const freeLimits = LIMITS[PLANS.FREE];

  it("blocks when daily limit reached", () => {
    const result = canMakeRagQuery(freeLimits, 20);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("RAG query limit");
  });

  it("allows when under limit", () => {
    const result = canMakeRagQuery(freeLimits, 19);
    expect(result.allowed).toBe(true);
  });
});

describe("canMakeApiRequest", () => {
  const freeLimits = LIMITS[PLANS.FREE];
  const proLimits = LIMITS[PLANS.PRO];

  it("blocks API access on free plan", () => {
    const result = canMakeApiRequest(freeLimits, 0);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Pro plan");
  });

  it("blocks when daily API limit reached on pro", () => {
    const result = canMakeApiRequest(proLimits, 1000);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("API request limit");
  });

  it("allows API requests on pro within limit", () => {
    const result = canMakeApiRequest(proLimits, 999);
    expect(result.allowed).toBe(true);
  });
});

describe("canAddMcpServer", () => {
  const freeLimits = LIMITS[PLANS.FREE];
  const proLimits = LIMITS[PLANS.PRO];

  it("allows first integration on free plan", () => {
    const result = canAddMcpServer(freeLimits, 0);
    expect(result.allowed).toBe(true);
  });

  it("blocks second integration on free plan", () => {
    const result = canAddMcpServer(freeLimits, 1);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Maximum 1 integration");
  });

  it("allows unlimited integrations on pro plan", () => {
    const result = canAddMcpServer(proLimits, 50);
    expect(result.allowed).toBe(true);
  });
});
