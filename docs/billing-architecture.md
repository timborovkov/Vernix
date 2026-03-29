# Billing Architecture

> How Vernix billing works end-to-end: Polar setup, data flow, usage tracking, and limit enforcement.

---

## Overview

Vernix uses **Polar.sh** as its merchant of record for subscription billing and usage-based metered billing. The billing stack is:

- **Polar** — subscription management, checkout, customer portal, metered usage invoicing
- **Postgres (usageEvents table)** — local usage tracking for real-time limit enforcement
- **Polar Events API** — metered usage sync for end-of-period invoicing

### Architecture Diagram

```
User → Checkout (Polar hosted) → Webhook → DB update (plan: pro)
                                              ↓
User uses app → usageEvents table (local) ← limit checks
                     ↓
              Polar Events API (async sync for metered billing)
                     ↓
              End-of-period invoice (Polar handles)
```

---

## Polar Dashboard Setup

### 1. Create Products

Create two products in the Polar dashboard:

| Product         | Type         | Price     | Trial        |
| --------------- | ------------ | --------- | ------------ |
| **Pro Monthly** | Subscription | €29/month | 14-day trial |
| **Pro Annual**  | Subscription | €288/year | 14-day trial |

Enable "Prevent trial abuse" on both products.

### 2. Create Meter

Create one meter for all meeting usage, tracked in EUR:

| Meter             | Filter                      | Aggregation       |
| ----------------- | --------------------------- | ----------------- |
| **Meeting usage** | Name equals `meeting_usage` | Sum of `cost_eur` |

Each event includes `cost_eur` calculated at €3/hr (voice) or €1.50/hr (silent). The meter aggregates total EUR spent, regardless of meeting type.

### 3. Attach Metered Price

On each product, attach one metered price:

| Meter         | Price per unit | Unit  |
| ------------- | -------------- | ----- |
| Meeting usage | €1.00          | 1 EUR |

Since the meter already aggregates in EUR, the price per unit is €1 (1:1 pass-through).

### 4. Configure Credit

Assign a **€30/month credit** on the Meeting usage meter for each product. This covers the first €30 of usage. Overages beyond €30 are billed at the metered rate.

Trial users don't use Polar credits. Their 90-minute cap is enforced locally via `TRIAL_LIMITS.meetingMinutesPerMonth`. Polar defers payment during the trial period.

### 5. Configure Webhook

Add a webhook endpoint in Polar settings:

- **URL:** `https://your-domain.com/api/webhooks/polar`
- **Events:** `subscription.created`, `subscription.active`, `subscription.updated`, `subscription.canceled`, `subscription.revoked`, `customer.created`
- **Secret:** Generate and set as `POLAR_WEBHOOK_SECRET`

### 6. Environment Variables

```bash
POLAR_ACCESS_TOKEN=polar_pat_...                # Organization access token
POLAR_WEBHOOK_SECRET=whsec_...                  # Webhook signing secret
NEXT_PUBLIC_POLAR_PRODUCT_ID_PRO_MONTHLY=prod_... # Product ID for monthly plan
NEXT_PUBLIC_POLAR_PRODUCT_ID_PRO_ANNUAL=prod_...  # Product ID for annual plan
POLAR_SERVER=sandbox                            # "sandbox" or "production"
```

---

## Data Model

### Users Table (billing fields)

```
plan               enum(free, pro)    — current plan
polarCustomerId    text               — Polar customer ID
polarSubscriptionId text              — Polar subscription ID
trialEndsAt        timestamp          — when trial expires (set on signup)
currentPeriodStart timestamp          — billing period start (from Polar webhook)
currentPeriodEnd   timestamp          — billing period end (from Polar webhook)
```

### Usage Events Table

```
id         uuid PK
userId     uuid FK → users
meetingId  uuid FK → meetings (nullable)
type       enum(voice_meeting, silent_meeting, rag_query, api_request, doc_upload)
quantity   numeric(10,2)  — minutes for meetings, count for others
costEur    numeric(10,4)  — calculated cost in EUR
metadata   jsonb
createdAt  timestamp
```

---

## Checkout Flow

1. User clicks "Upgrade to Pro" (pricing page, settings, or paywall dialog)
2. Frontend calls `GET /api/checkout?interval=monthly|annual`
3. Server reads session via `auth()` — no user IDs in query params (prevents impersonation)
4. Server creates Polar checkout with `customerExternalId` from session
5. Returns redirect URL to Polar's hosted checkout
6. Polar handles checkout (payment info, trial activation)
7. On success: redirected to `/dashboard/settings?billing=success`
8. Polar fires `subscription.created` webhook → starts trial or activates Pro

The checkout route uses Polar SDK directly (not `@polar-sh/nextjs` Checkout helper) for more control over error handling. SDKError 401 returns a specific "Polar configuration error" message.

### Customer External ID

The user's UUID is passed as `customerExternalId` during checkout via server-side session. This links the Polar customer to our user record, enabling webhook handlers to find the right user via `payload.data.customer.externalId`.

---

## Webhook Handler

`src/app/api/webhooks/polar/route.ts` handles:

| Event                   | Action                                                                                                                                                                                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `subscription.created`  | If trialing: keep plan=free, set trialEndsAt from Polar (trial limits apply via `getEffectiveLimits`: full Pro features capped at 90 min). If active: set plan=pro. Store Polar IDs and period dates. Guards against race condition with `subscription.active` — won't downgrade a user already on Pro. |
| `subscription.active`   | Set plan=pro, update period dates. Fires when trial ends and payment succeeds, or on renewal.                                                                                                                                                                                                           |
| `subscription.updated`  | Update period dates                                                                                                                                                                                                                                                                                     |
| `subscription.canceled` | Send retention email, do NOT downgrade (user keeps access until period ends)                                                                                                                                                                                                                            |
| `subscription.revoked`  | Set plan=free, clear subscription + trial fields. Always downgrade immediately. Polar only fires this AFTER the access period has ended ([docs](https://docs.polar.sh/api-reference/webhooks/subscription.revoked)).                                                                                    |
| `customer.created`      | Store polarCustomerId                                                                                                                                                                                                                                                                                   |

Webhook signature verification is handled by `@polar-sh/nextjs` `Webhooks` helper using `POLAR_WEBHOOK_SECRET`.

---

## Usage Tracking

### Local Tracking (real-time enforcement)

Every billable action is recorded in the `usageEvents` table:

- **Meeting end:** `recordMeetingUsage(userId, meetingId, type, durationMinutes)` — calculates cost at €3/hr (voice) or €1.50/hr (silent)
- **RAG query:** `recordUsageEvent(userId, "rag_query")`
- **API request:** `recordUsageEvent(userId, "api_request")`
- **Doc upload:** `recordUsageEvent(userId, "doc_upload")`

### Polar Sync (metered billing)

After recording locally, `syncUsageToPolar()` sends a single `meeting_usage` event to Polar with `cost_eur` in metadata. Polar aggregates total EUR on the Meeting usage meter, applies the €30 credit, and bills any overage at period end. This is fire-and-forget — local tracking is the source of truth for limit enforcement.

### Usage Queries

- `getUsageSummary(userId, plan, periodStart, periodEnd)` — aggregate all usage types for a billing period
- `getDailyCount(userId, type)` — count today's RAG queries or API requests
- `getMonthlyMeetingCount(userId)` — anti-abuse meeting count

---

## Limit Enforcement

### How Limits Are Resolved

```
getEffectiveLimits(plan, trialEndsAt) → EffectiveLimits
```

- **Free plan, no trial:** `LIMITS.free` (30 min silent, no voice, 5 docs, etc.)
- **Free plan, active trial:** `TRIAL_LIMITS` (full Pro features, capped at 90 minutes)
- **Pro plan:** `LIMITS.pro` (unlimited minutes via credits, 200 docs, API/MCP)

### Check Functions

| Function              | What it checks                                              |
| --------------------- | ----------------------------------------------------------- |
| `canStartMeeting()`   | Voice enabled, concurrent meetings, monthly cap, minute cap |
| `canUploadDocument()` | Doc count, monthly uploads, file size, storage cap          |
| `canMakeRagQuery()`   | Daily RAG query limit                                       |
| `canMakeApiRequest()` | API enabled, daily request limit                            |

Each returns `{ allowed: boolean, reason?: string }`.

### Where Enforcement Happens

Enforcement should be added at the API route level:

1. **Meeting creation** (`POST /api/meetings`) — check `canStartMeeting()`
2. **Bot join** (`POST /api/agent/join`) — check voice enabled + concurrent meetings
3. **Knowledge upload** (`POST /api/knowledge`) — check `canUploadDocument()`
4. **RAG chat** (`POST /api/agent/chat`, `POST /api/agent/respond`) — check `canMakeRagQuery()`
5. **MCP endpoint** (`/api/mcp`) — check `canMakeApiRequest()`

> **Note:** Enforcement is not yet wired into these routes. The limit-checking functions exist in `src/lib/billing/limits.ts` and should be called at the start of each route handler.

---

## Trial System

- Trial starts when user subscribes to Pro via Polar checkout (NOT on signup)
- `trialEndsAt` is set from Polar's `subscription.created` webhook (status: trialing)
- Trial gives full Pro features including voice, integrations, API, and MCP, capped at 90 total minutes
- Trial state requires both `plan === "free"` AND `polarSubscriptionId` exists — prevents stale trial state
- When trial expires, user falls back to Free limits until payment succeeds
- `isTrialActive(plan, trialEndsAt)` checks both plan and date
- Polar's trial abuse prevention (email + payment fingerprinting) handles duplicate prevention at checkout

---

## Billing UI

### Settings Page (`/dashboard/settings`)

The `BillingCard` component shows:

- Current plan badge (Free/Pro) + trial status
- Credit usage bar (Pro only) — €X.XX / €30.00
- Meeting minutes, RAG queries, API requests usage bars
- Overage amount if credits exceeded
- "Upgrade to Pro" button (Free users) or "Manage Subscription" (Pro users → Polar customer portal)
- Billing period dates

### Pricing Page (`/pricing`)

- For logged-out users: "Start 14-Day Free Trial" → `/register`
- For logged-in users: "Upgrade to Pro" → `/api/checkout?products=<id>`
- Monthly/annual toggle switches the product ID in the checkout URL

### Customer Portal

`GET /api/portal` redirects authenticated users to Polar's hosted customer portal where they can:

- View orders and invoices
- Update payment method
- Cancel or reactivate subscription
- View current usage/meter balances

---

## Constants

All billing constants live in `src/lib/billing/constants.ts`:

- `PLANS` — plan identifiers
- `PRICING` — EUR prices
- `USAGE_RATES` — EUR/hour rates
- `MONTHLY_CREDIT` — included credit per plan
- `FREE_TRIAL` — trial duration and minute cap
- `LIMITS` — per-plan hard caps (meetings, docs, queries, API, MCP)
- `TRIAL_LIMITS` — trial limits (full Pro features, 90-minute meeting cap)

---

## Future Work

- [x] Wire limit enforcement into API route handlers
- [ ] Spending cap support (optional per-user cap stored in DB)
- [ ] Spending alerts at 80% and 100% credit usage (via email)
- [ ] Churned user data retention policy (30-day read-only, 90-day archive, 180-day delete)
- [ ] Admin dashboard for manual plan/credit adjustments
- [ ] Trial abuse detection (disposable email blocking, IP rate limiting)
- [ ] Usage-based API rate limiting per API key
