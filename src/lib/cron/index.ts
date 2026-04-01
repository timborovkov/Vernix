import { runMeetingRecovery } from "./jobs/meeting-recovery";
import { runBillingSync } from "./jobs/billing-sync";
import { runRecordingRetention } from "./jobs/recording-retention";
import { runUpgradeReminders } from "./jobs/upgrade-reminders";
import { runTokenPurge } from "./jobs/token-purge";
import { runDocumentWatchdog } from "./jobs/document-watchdog";
import { runUsageAudit } from "./jobs/usage-audit";
import { runBillingRetry } from "./jobs/billing-retry";
import { runQdrantCleanup } from "./jobs/qdrant-cleanup";
import { runStorageCleanup } from "./jobs/storage-cleanup";
import { runInactiveCleanup } from "./jobs/inactive-cleanup";
import { runOrphanSweeper } from "./jobs/orphan-sweeper";

interface CronJob {
  name: string;
  handler: () => Promise<Record<string, unknown>>;
  /** Returns true if this job should run at the given UTC time. */
  shouldRun: (now: Date) => boolean;
}

/**
 * Cron job registry. The dispatcher is called every 5 minutes and uses
 * shouldRun() to decide which jobs to execute on each invocation.
 */
export const CRON_JOBS: CronJob[] = [
  {
    name: "meeting-recovery",
    handler: runMeetingRecovery,
    // Every 5 minutes — always runs
    shouldRun: () => true,
  },
  {
    name: "billing-sync",
    handler: runBillingSync,
    // Every 6 hours (00:00, 06:00, 12:00, 18:00 UTC)
    shouldRun: (now) => now.getUTCHours() % 6 === 0 && now.getUTCMinutes() < 5,
  },
  {
    name: "recording-retention",
    handler: runRecordingRetention,
    // Daily at 03:00 UTC
    shouldRun: (now) => now.getUTCHours() === 3 && now.getUTCMinutes() < 5,
  },
  {
    name: "upgrade-reminders",
    handler: runUpgradeReminders,
    // Weekly on Monday at 09:00 UTC
    shouldRun: (now) =>
      now.getUTCDay() === 1 &&
      now.getUTCHours() === 9 &&
      now.getUTCMinutes() < 5,
  },
  {
    name: "token-purge",
    handler: runTokenPurge,
    // Daily at 04:00 UTC
    shouldRun: (now) => now.getUTCHours() === 4 && now.getUTCMinutes() < 5,
  },
  {
    name: "document-watchdog",
    handler: runDocumentWatchdog,
    // Every 30 minutes (at :00 and :30 of each hour)
    shouldRun: (now) => {
      const m = now.getUTCMinutes();
      return m < 5 || (m >= 30 && m < 35);
    },
  },
  {
    name: "usage-audit",
    handler: runUsageAudit,
    // Daily at 05:00 UTC
    shouldRun: (now) => now.getUTCHours() === 5 && now.getUTCMinutes() < 5,
  },
  {
    name: "billing-retry",
    handler: runBillingRetry,
    // Every 6 hours (same as billing-sync)
    shouldRun: (now) => now.getUTCHours() % 6 === 0 && now.getUTCMinutes() < 5,
  },
  {
    name: "qdrant-cleanup",
    handler: runQdrantCleanup,
    // Weekly Sunday at 04:00 UTC
    shouldRun: (now) =>
      now.getUTCDay() === 0 &&
      now.getUTCHours() === 4 &&
      now.getUTCMinutes() < 5,
  },
  {
    name: "storage-cleanup",
    handler: runStorageCleanup,
    // Weekly Sunday at 05:00 UTC
    shouldRun: (now) =>
      now.getUTCDay() === 0 &&
      now.getUTCHours() === 5 &&
      now.getUTCMinutes() < 5,
  },
  {
    name: "inactive-cleanup",
    handler: runInactiveCleanup,
    // Weekly Monday at 04:00 UTC
    shouldRun: (now) =>
      now.getUTCDay() === 1 &&
      now.getUTCHours() === 4 &&
      now.getUTCMinutes() < 5,
  },
  {
    name: "orphan-sweeper",
    handler: runOrphanSweeper,
    // Weekly Sunday at 03:00 UTC
    shouldRun: (now) =>
      now.getUTCDay() === 0 &&
      now.getUTCHours() === 3 &&
      now.getUTCMinutes() < 5,
  },
];

/**
 * Run all cron jobs that are due at the current time.
 * Returns a summary of which jobs ran, which were skipped, and any errors.
 */
export async function runDueCronJobs() {
  const now = new Date();
  const ran: string[] = [];
  const skipped: string[] = [];
  const results: Record<string, Record<string, unknown>> = {};
  const errors: Record<string, string> = {};

  for (const job of CRON_JOBS) {
    if (!job.shouldRun(now)) {
      skipped.push(job.name);
      continue;
    }

    try {
      console.log(`[Cron] Running ${job.name}`);
      const result = await job.handler();
      ran.push(job.name);
      results[job.name] = result;
    } catch (err) {
      ran.push(job.name);
      errors[job.name] = err instanceof Error ? err.message : "Unknown error";
      console.error(`[Cron] ${job.name} failed:`, err);
    }
  }

  return { ran, skipped, results, errors };
}
