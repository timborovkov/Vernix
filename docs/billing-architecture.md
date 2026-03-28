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

### 2. Create Meters

Create two meters for usage-based billing:

| Meter              | Filter                       | Aggregation             |
| ------------------ | ---------------------------- | ----------------------- |
| **Voice Minutes**  | Name equals `voice_minutes`  | Sum of `duration_hours` |
| **Silent Minutes** | Name equals `silent_minutes` | Sum of `duration_hours` |

### 3. Attach Metered Prices

On each product, attach metered prices:

| Meter          | Price per unit (hour) |
| -------------- | --------------------- |
| Voice Minutes  | €3.00/hr              |
| Silent Minutes | €1.50/hr              |

The €30 included credit is handled by Polar's credit system — configure a €30/month credit on each product.

### 4. Configure Webhook

Add a webhook endpoint in Polar settings:

- **URL:** `https://your-domain.com/api/webhooks/polar`
- **Events:** `subscription.created`, `subscription.active`, `subscription.updated`, `subscription.canceled`, `subscription.revoked`, `customer.created`
- **Secret:** Generate and set as `POLAR_WEBHOOK_SECRET`

### 5. Environment Variables

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

1. User clicks "Upgrade to Pro" on pricing page or settings
2. Redirected to `GET /api/checkout?products=<product_id>&customerExternalId=<userId>&customerEmail=<email>`
3. Polar handles checkout (payment info, trial activation)
4. On success: redirected to `/dashboard/settings?billing=success`
5. Polar fires `subscription.created` webhook → updates user's plan to `pro`

The checkout route uses `@polar-sh/nextjs` `Checkout` helper — it handles the redirect to Polar's hosted checkout.

### Customer External ID

We pass the user's UUID as `customerExternalId` in checkout. This links the Polar customer to our user record, enabling webhook handlers to find the right user via `payload.data.customer.externalId`.

---

## Webhook Handler

`src/app/api/webhooks/polar/route.ts` handles:

| Event                   | Action                                                            |
| ----------------------- | ----------------------------------------------------------------- |
| `subscription.created`  | Set plan=pro, store polarCustomerId, subscriptionId, period dates |
| `subscription.active`   | Update period dates (renewal)                                     |
| `subscription.updated`  | Update period dates                                               |
| `subscription.canceled` | Log (subscription stays active until period end)                  |
| `subscription.revoked`  | Set plan=free, clear subscription fields                          |
| `customer.created`      | Store polarCustomerId                                             |

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

After recording locally, `syncUsageToPolar()` sends the event to Polar's Events API. Polar accumulates these and invoices at period end. This is fire-and-forget — local tracking is the source of truth for limit enforcement.

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
- **Free plan, active trial:** `TRIAL_LIMITS` (Pro limits minus API/MCP)
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

- On signup (both email/password and OAuth), `trialEndsAt` is set to `now + 14 days`
- Trial gives Pro-level limits except API/MCP access
- When trial expires, user falls back to Free limits
- Trial is checked via `isTrialActive(trialEndsAt)` — simple date comparison
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
- `TRIAL_LIMITS` — trial-specific limits
- `POLAR_PRODUCTS` — env-backed product ID accessors

---

## Future Work

- [x] Wire limit enforcement into API route handlers
- [ ] Spending cap support (optional per-user cap stored in DB)
- [ ] Spending alerts at 80% and 100% credit usage (via email)
- [ ] Churned user data retention policy (30-day read-only, 90-day archive, 180-day delete)
- [ ] Admin dashboard for manual plan/credit adjustments
- [ ] Trial abuse detection (disposable email blocking, IP rate limiting)
- [ ] Usage-based API rate limiting per API key
