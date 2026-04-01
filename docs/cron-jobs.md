# Cron Jobs

> Scheduled tasks that run on a recurring basis outside of user requests.

---

## Overview

Vernix uses HTTP-based cron endpoints under `/api/cron/*`. All job logic lives in `src/lib/cron/jobs/` and is registered in `src/lib/cron/index.ts`.

A **unified dispatcher** at `GET /api/cron` determines which jobs are due based on the current UTC time and runs them. This allows a single Railway cron service to drive all jobs.

All endpoints are protected by a shared `CRON_SECRET` Bearer token.

---

## Setup

### Environment Variable

```bash
CRON_SECRET=your-secret-here  # Generate with: openssl rand -base64 32
RECORDING_RETENTION_DAYS=90   # Optional, defaults to 90
```

### Scheduler (Railway)

Only **one** Railway cron service is needed:

1. In your Railway project canvas, click **"+ Add"** > **"Empty Service"**
2. Name it `cron-dispatcher`
3. In **Settings > Source**: click **"Connect Image"** and enter `curlimages/curl:latest`
4. In **Settings > Deploy**:
   - **Start Command**: `sh -c 'curl -sf -H "Authorization: Bearer $CRON_SECRET" $APP_URL/api/cron'`
   - **Cron Schedule**: `*/5 * * * *` (every 5 minutes)
5. In **Variables**: add `CRON_SECRET` and `APP_URL` (e.g. `https://vernix.app`)

The dispatcher runs every 5 minutes and evaluates which jobs are due. Jobs with longer intervals (6h, daily, weekly) only execute when their schedule window matches.

**Local development:**

```bash
curl -H "Authorization: Bearer your-cron-secret-here" http://localhost:3000/api/cron
```

---

## Jobs

### Meeting Recovery

| Field        | Value                                   |
| ------------ | --------------------------------------- |
| **Schedule** | Every 5 minutes (always runs)           |
| **Handler**  | `src/lib/cron/jobs/meeting-recovery.ts` |

**What it does:**

1. **Stuck `joining` > 10 min** -- marks as `failed`
2. **Stuck `active` > 30 min** -- queries Recall bot status; if done/fatal, processes the meeting; if still in call > 4h, forces leave
3. **Stuck `processing` > 2 hours** -- retries `processMeetingEnd()`
4. **Missing recordings** -- logs count of recent completed meetings without recordings

**Idempotency:** Safe to run multiple times; recovery logic checks current status before acting.

---

### Billing Sync

| Field        | Value                                          |
| ------------ | ---------------------------------------------- |
| **Schedule** | Every 6 hours (00:00, 06:00, 12:00, 18:00 UTC) |
| **Handler**  | `src/lib/cron/jobs/billing-sync.ts`            |

**What it does:**

1. Finds Pro users whose billing period has ended (potential missed webhook)
2. Finds free users with expired trial dates
3. Calls `syncBillingFromPolar()` for each to reconcile local DB with Polar's state

**Idempotency:** Safe to run multiple times; `syncBillingFromPolar` is idempotent.

---

### Recording Retention

| Field        | Value                                      |
| ------------ | ------------------------------------------ |
| **Schedule** | Daily at 03:00 UTC                         |
| **Handler**  | `src/lib/cron/jobs/recording-retention.ts` |

**What it does:**

1. Reads retention period from `RECORDING_RETENTION_DAYS` env var (default: 90 days)
2. Finds completed meetings with recordings older than the retention period (limit 50 per run)
3. Deletes the recording file from S3
4. Attempts to delete the Recall bot (likely already gone)
5. Clears `recordingKey` from meeting metadata

**Safety:** If S3 deletion fails, the meeting is skipped (metadata is not cleared), so it will be retried on the next run. Meetings with null `userId` are skipped with a warning.

**Idempotency:** Safe to run multiple times; once `recordingKey` is cleared, the meeting won't be selected again.

---

### Upgrade Reminders

| Field        | Value                                    |
| ------------ | ---------------------------------------- |
| **Schedule** | Weekly on Monday at 09:00 UTC            |
| **Handler**  | `src/lib/cron/jobs/upgrade-reminders.ts` |

**What it does:**

1. Queries users on the Free plan who are not currently in trial
2. Skips users who already received an upgrade reminder in the last 7 days
3. Sends an upgrade-to-Pro reminder via Resend
4. Updates `lastUpgradeReminderSentAt` for throttling

**Idempotency:** Safe to run multiple times; users are throttled by `lastUpgradeReminderSentAt`.

---

### Token Purge

| Field        | Value                              |
| ------------ | ---------------------------------- |
| **Schedule** | Daily at 04:00 UTC                 |
| **Handler**  | `src/lib/cron/jobs/token-purge.ts` |

**What it does:** Deletes expired password reset tokens from the database.

**Idempotency:** Safe to run multiple times; only deletes tokens past their expiry.

---

### Document Watchdog

| Field        | Value                                    |
| ------------ | ---------------------------------------- |
| **Schedule** | Every 30 minutes                         |
| **Handler**  | `src/lib/cron/jobs/document-watchdog.ts` |

**What it does:** Finds documents stuck in `processing` status for over 30 minutes and marks them `failed` with a timeout error. Limit 20 per run.

**Idempotency:** Safe to run multiple times; only acts on documents still in `processing` status.

---

### Usage Audit

| Field        | Value                              |
| ------------ | ---------------------------------- |
| **Schedule** | Daily at 05:00 UTC                 |
| **Handler**  | `src/lib/cron/jobs/usage-audit.ts` |

**What it does:** Detects completed meetings from the last 48 hours missing `usage_events` rows and backfills them via `recordMeetingUsage()`. Limit 50 per run.

**Idempotency:** Safe to run multiple times; `recordMeetingUsage` has built-in deduplication.

---

### Billing Retry

| Field        | Value                                |
| ------------ | ------------------------------------ |
| **Schedule** | Every 6 hours                        |
| **Handler**  | `src/lib/cron/jobs/billing-retry.ts` |

**What it does:** Finds `usage_events` from the last 7 days where `polarSyncedAt IS NULL` and re-attempts Polar metered usage sync. Limit 50 per run.

**Idempotency:** Uses Polar's `externalId` for deduplication; safe to retry.

---

### Qdrant Cleanup

| Field        | Value                                 |
| ------------ | ------------------------------------- |
| **Schedule** | Weekly Sunday at 04:00 UTC            |
| **Handler**  | `src/lib/cron/jobs/qdrant-cleanup.ts` |

**What it does:** Lists all Qdrant collections, checks `meeting_*` and `knowledge_*` collections against the database, and deletes orphaned ones. Limit 20 deletions per run.

---

### Storage Cleanup

| Field        | Value                                  |
| ------------ | -------------------------------------- |
| **Schedule** | Weekly Sunday at 05:00 UTC             |
| **Handler**  | `src/lib/cron/jobs/storage-cleanup.ts` |

**What it does:** Scans S3 `knowledge/` and `recordings/` prefixes for files without matching DB records and deletes orphaned objects. Limit 30 deletions per run.

---

### Inactive Cleanup

| Field        | Value                                   |
| ------------ | --------------------------------------- |
| **Schedule** | Weekly Monday at 04:00 UTC              |
| **Handler**  | `src/lib/cron/jobs/inactive-cleanup.ts` |

**What it does:** Detects free-plan users with no activity in 180 days. Currently informational only (logs count). Actual archival/deletion requires a warning email flow.

---

### Orphan Sweeper

| Field        | Value                                 |
| ------------ | ------------------------------------- |
| **Schedule** | Weekly Sunday at 03:00 UTC            |
| **Handler**  | `src/lib/cron/jobs/orphan-sweeper.ts` |

**What it does:**

1. Deletes `usage_events` with null `meetingId` older than 90 days
2. Re-parents documents referencing deleted meetings (sets `meetingId = NULL`)

Limit 100 per run.

---

## Unified Dispatcher Response

```json
{
  "ran": ["meeting-recovery", "billing-sync"],
  "skipped": ["recording-retention", "upgrade-reminders"],
  "results": {
    "meeting-recovery": { "recovered": 2 },
    "billing-sync": { "synced": 0 }
  },
  "errors": {}
}
```

---

## Adding New Cron Jobs

1. Create a handler in `src/lib/cron/jobs/<job-name>.ts` exporting an async function
2. Register it in `src/lib/cron/index.ts` with a `shouldRun()` schedule check
3. Add the job to this document

---

## Email Lifecycle Jobs

### Mid-Trial Check-in

| Field        | Value                                    |
| ------------ | ---------------------------------------- |
| **Schedule** | Daily at 10:00 UTC                       |
| **Handler**  | `src/lib/cron/jobs/mid-trial-checkin.ts` |

Sends a check-in email to users ~7 days into their 14-day trial. Queries users whose `trialEndsAt` is 6-8 days from now and `midTrialEmailSentAt` is null. Respects email preferences.

### Trial Warning

| Field        | Value                                |
| ------------ | ------------------------------------ |
| **Schedule** | Daily at 10:00 UTC                   |
| **Handler**  | `src/lib/cron/jobs/trial-warning.ts` |

Sends trial ending warning emails. Two warnings per trial: day 11 (3 days left) and day 13 (1 day left), using a 2-day cooldown between sends via `trialWarningEmailSentAt`. Respects email preferences.

### Win-Back

| Field        | Value                           |
| ------------ | ------------------------------- |
| **Schedule** | Daily at 11:00 UTC              |
| **Handler**  | `src/lib/cron/jobs/win-back.ts` |

Sends re-engagement email to users who churned ~30 days ago. Queries users where `churnedAt` is 29-31 days ago and `winBackEmailSentAt` is null. Respects marketing email preferences.

---

## Future Jobs

- **Dead-user data purge** -- Purge S3 + Qdrant + Recall data for deleted/expired accounts (requires user deletion flow first)
- **Usage credit reset** -- Reset monthly usage counters at billing period boundaries
- **Data retention cleanup** -- Archive/delete data for churned users per retention policy
- **Usage alerts** -- Send email when Pro users hit 80% or 100% of their monthly credit
