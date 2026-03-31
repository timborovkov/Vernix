import { describe, it, expect, vi, beforeEach } from "vitest";

const mockHandlers = vi.hoisted(() => ({
  runMeetingRecovery: vi.fn().mockResolvedValue({ recovered: 0 }),
  runBillingSync: vi.fn().mockResolvedValue({ synced: 0 }),
  runRecordingRetention: vi.fn().mockResolvedValue({ deleted: 0 }),
  runUpgradeReminders: vi.fn().mockResolvedValue({ sent: 0 }),
}));

vi.mock("./jobs/meeting-recovery", () => ({
  runMeetingRecovery: mockHandlers.runMeetingRecovery,
}));
vi.mock("./jobs/billing-sync", () => ({
  runBillingSync: mockHandlers.runBillingSync,
}));
vi.mock("./jobs/recording-retention", () => ({
  runRecordingRetention: mockHandlers.runRecordingRetention,
}));
vi.mock("./jobs/upgrade-reminders", () => ({
  runUpgradeReminders: mockHandlers.runUpgradeReminders,
}));

import { CRON_JOBS, runDueCronJobs } from "./index";

describe("CRON_JOBS schedule logic", () => {
  describe("meeting-recovery", () => {
    it("always runs", () => {
      const job = CRON_JOBS.find((j) => j.name === "meeting-recovery")!;
      // Any arbitrary time
      expect(job.shouldRun(new Date("2026-03-15T14:37:00Z"))).toBe(true);
      expect(job.shouldRun(new Date("2026-03-16T02:00:00Z"))).toBe(true);
    });
  });

  describe("billing-sync", () => {
    const job = () => CRON_JOBS.find((j) => j.name === "billing-sync")!;

    it("runs at 00:00, 06:00, 12:00, 18:00 UTC within the 5-min window", () => {
      expect(job().shouldRun(new Date("2026-03-15T00:00:00Z"))).toBe(true);
      expect(job().shouldRun(new Date("2026-03-15T06:04:59Z"))).toBe(true);
      expect(job().shouldRun(new Date("2026-03-15T12:00:00Z"))).toBe(true);
      expect(job().shouldRun(new Date("2026-03-15T18:03:00Z"))).toBe(true);
    });

    it("does not run outside 6-hour boundaries", () => {
      expect(job().shouldRun(new Date("2026-03-15T03:00:00Z"))).toBe(false);
      expect(job().shouldRun(new Date("2026-03-15T09:00:00Z"))).toBe(false);
      expect(job().shouldRun(new Date("2026-03-15T15:02:00Z"))).toBe(false);
    });

    it("does not run after the 5-min window", () => {
      expect(job().shouldRun(new Date("2026-03-15T06:05:00Z"))).toBe(false);
      expect(job().shouldRun(new Date("2026-03-15T12:10:00Z"))).toBe(false);
    });
  });

  describe("recording-retention", () => {
    const job = () => CRON_JOBS.find((j) => j.name === "recording-retention")!;

    it("runs at 03:00 UTC within the 5-min window", () => {
      expect(job().shouldRun(new Date("2026-03-15T03:00:00Z"))).toBe(true);
      expect(job().shouldRun(new Date("2026-03-15T03:04:30Z"))).toBe(true);
    });

    it("does not run at other hours", () => {
      expect(job().shouldRun(new Date("2026-03-15T02:59:59Z"))).toBe(false);
      expect(job().shouldRun(new Date("2026-03-15T03:05:00Z"))).toBe(false);
      expect(job().shouldRun(new Date("2026-03-15T15:03:00Z"))).toBe(false);
    });
  });

  describe("upgrade-reminders", () => {
    const job = () => CRON_JOBS.find((j) => j.name === "upgrade-reminders")!;

    it("runs on Monday at 09:00 UTC within the 5-min window", () => {
      // 2026-03-16 is a Monday
      expect(job().shouldRun(new Date("2026-03-16T09:00:00Z"))).toBe(true);
      expect(job().shouldRun(new Date("2026-03-16T09:04:00Z"))).toBe(true);
    });

    it("does not run on non-Monday days", () => {
      // 2026-03-15 is a Sunday
      expect(job().shouldRun(new Date("2026-03-15T09:00:00Z"))).toBe(false);
      // 2026-03-17 is a Tuesday
      expect(job().shouldRun(new Date("2026-03-17T09:00:00Z"))).toBe(false);
    });

    it("does not run at wrong hour on Monday", () => {
      expect(job().shouldRun(new Date("2026-03-16T08:00:00Z"))).toBe(false);
      expect(job().shouldRun(new Date("2026-03-16T10:00:00Z"))).toBe(false);
    });

    it("does not run after the 5-min window on Monday", () => {
      expect(job().shouldRun(new Date("2026-03-16T09:05:00Z"))).toBe(false);
    });
  });
});

describe("runDueCronJobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs only meeting-recovery at a non-matching time", async () => {
    // Tuesday 14:37 UTC — only meeting-recovery should fire
    vi.setSystemTime(new Date("2026-03-17T14:37:00Z"));

    const result = await runDueCronJobs();

    expect(result.ran).toContain("meeting-recovery");
    expect(result.skipped).toContain("billing-sync");
    expect(result.skipped).toContain("recording-retention");
    expect(result.skipped).toContain("upgrade-reminders");
    expect(mockHandlers.runMeetingRecovery).toHaveBeenCalledOnce();
    expect(mockHandlers.runBillingSync).not.toHaveBeenCalled();
  });

  it("runs meeting-recovery and billing-sync at 06:00 UTC", async () => {
    vi.setSystemTime(new Date("2026-03-17T06:02:00Z"));

    const result = await runDueCronJobs();

    expect(result.ran).toContain("meeting-recovery");
    expect(result.ran).toContain("billing-sync");
    expect(result.skipped).toContain("recording-retention");
  });

  it("runs recording-retention at 03:00 UTC", async () => {
    vi.setSystemTime(new Date("2026-03-17T03:01:00Z"));

    const result = await runDueCronJobs();

    expect(result.ran).toContain("recording-retention");
    expect(mockHandlers.runRecordingRetention).toHaveBeenCalledOnce();
  });

  it("runs all jobs on Monday at 09:00 UTC that matches 6-hour boundary too", async () => {
    // Monday 2026-03-16 at 09:00 — but 9 % 6 !== 0, so billing-sync should NOT run
    vi.setSystemTime(new Date("2026-03-16T09:01:00Z"));

    const result = await runDueCronJobs();

    expect(result.ran).toContain("meeting-recovery");
    expect(result.ran).toContain("upgrade-reminders");
    expect(result.skipped).toContain("billing-sync");
    expect(result.skipped).toContain("recording-retention");
  });

  it("captures handler errors without crashing", async () => {
    vi.setSystemTime(new Date("2026-03-17T14:37:00Z"));
    mockHandlers.runMeetingRecovery.mockRejectedValueOnce(
      new Error("DB connection failed")
    );

    const result = await runDueCronJobs();

    expect(result.ran).toContain("meeting-recovery");
    expect(result.errors["meeting-recovery"]).toBe("DB connection failed");
    expect(result.results["meeting-recovery"]).toBeUndefined();
  });

  it("returns handler results in the results map", async () => {
    vi.setSystemTime(new Date("2026-03-17T14:37:00Z"));
    mockHandlers.runMeetingRecovery.mockResolvedValueOnce({ recovered: 5 });

    const result = await runDueCronJobs();

    expect(result.results["meeting-recovery"]).toEqual({ recovered: 5 });
  });
});
