# Cron Jobs

> Scheduled tasks that run on a recurring basis outside of user requests.

---

## Overview

Vernix uses HTTP-based cron endpoints under `/api/cron/*`. Each endpoint is a standard Next.js API route that performs a scheduled task when called via GET. All endpoints are protected by a shared `CRON_SECRET` Bearer token to prevent unauthorized access.

These routes are not in the middleware matcher, so they bypass session auth. Authentication is via the `Authorization: Bearer <CRON_SECRET>` header instead.

---

## Setup

### Environment Variable

```bash
CRON_SECRET=your-secret-here  # Generate with: openssl rand -base64 32
```

### Scheduler (Railway)

Each cron job runs as a **separate Railway service** that starts on a schedule, calls the API endpoint via `curl`, and exits. Railway only charges for the seconds it runs.

**Setup per job:**

1. In your Railway project canvas, click **"+ Add"** > **"Empty Service"**
2. Name it (e.g. "upgrade-reminders-cron-job")
3. In the service **Settings > Source**: click **"Connect Image"** and enter `curlimages/curl:latest` (a minimal ~5MB image with just curl)
4. In **Settings > Deploy**:
   - **Start Command**: the `curl` command for that job (see job table below)
   - **Cron Schedule**: set to the job's schedule (e.g. Weekly / `0 9 * * 1`)
5. In the service **Variables**: add `CRON_SECRET` and `APP_URL` (e.g. `https://vernix.app`)

The cron service spins up, makes one HTTP request to the main Vernix app, and exits. Railway only charges for the seconds it runs.

**Important:** Do NOT set a cron schedule on the main Vernix service. It's a web server that must run continuously. Cron schedules are only for these lightweight helper services.

**Local development:**

```bash
curl -H "Authorization: Bearer your-cron-secret-here" http://localhost:3000/api/cron/upgrade-reminders
```

---

## Jobs

### Free Plan Upgrade Reminders

| Field             | Value                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| **Endpoint**      | `GET /api/cron/upgrade-reminders`                                                              |
| **Schedule**      | Weekly (`0 9 * * 1`)                                                                           |
| **Start command** | `sh -c 'curl -sf -H "Authorization: Bearer $CRON_SECRET" $APP_URL/api/cron/upgrade-reminders'` |
| **Variables**     | `CRON_SECRET`, `APP_URL` (e.g. `https://vernix.app`)                                           |
| **Source**        | `src/app/api/cron/upgrade-reminders/route.ts`                                                  |

**What it does:**

1. Queries users on the Free plan who are not currently in trial
2. Skips users who already received an upgrade reminder in the last 7 days
3. Sends an upgrade-to-Pro reminder via Resend
4. Updates `lastUpgradeReminderSentAt` for idempotency

**Idempotency:** Safe to run multiple times; users are throttled by `lastUpgradeReminderSentAt`.

**Dependencies:** Requires `CRON_SECRET` and Resend email configuration.

**Response:**

```json
{
  "sent": 5,
  "emails": ["alice@example.com", "bob@example.com", "..."]
}
```

## Adding New Cron Jobs

1. Create a new route at `src/app/api/cron/<job-name>/route.ts`
2. Verify `CRON_SECRET` at the top of the handler
3. Add the job to this document
4. Configure the schedule in your cron runner

### Template

```typescript
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const secret = request.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ... job logic ...

  return NextResponse.json({ ok: true });
}
```

---

## Future Jobs

- **Usage credit reset** — Reset monthly usage counters at billing period boundaries (currently handled by Polar's billing cycle)
- **Data retention cleanup** — Archive/delete data for churned users per retention policy (30-day read-only, 90-day archive, 180-day delete)
- **Stale meeting cleanup** — Mark meetings stuck in "joining" status for >1 hour as "failed"
- **Usage alerts** — Send email when Pro users hit 80% or 100% of their monthly credit
