# Vernix Unit Economics

Customer acquisition costs, lifetime value, and conversion funnel model.

All numbers based on the [pricing model](./pricing.md) with Pro at $29/mo, $30 credit, wake-on-demand voice at $1.40/hr, silent at $0.71/hr.

---

## Conversion Funnel

Conservative estimates based on typical B2B SaaS freemium benchmarks.

| Stage                | Monthly volume | Rate |
| -------------------- | -------------- | ---- |
| Landing page visits  | 5,000          | —    |
| Free signups         | 150            | 3.0% |
| Start trial          | 75             | 50%  |
| Use product in trial | 40             | 53%  |
| Convert to Pro       | 8              | 20%  |

**End-to-end: 0.16% of visits become Pro users.**

Typical SaaS benchmarks for comparison:

- Visitor → signup: 2–5% (we use 3%)
- Signup → trial activation: 40–60% (we use 50%)
- Trial → meaningful use: 40–60% (we use 53%)
- Trial → paid: 15–25% (we use 20%)

---

## Cost Per Acquisition

### Organic (no ad spend)

Free users and trialists cost us money before they ever pay.

| Cost driver                        | Monthly  |
| ---------------------------------- | -------- |
| Active free users (100 × $0.21)    | $21      |
| Trial users (75 × $1.06)           | $80      |
| **Total organic acquisition cost** | **$101** |
| New Pro conversions                | 8        |
| **Organic CAC**                    | **$13**  |

Trial cost dominates — each trialist costs $1.06 (~30 min voice + ~30 min silent on average over the 90 min trial). Most of the organic CAC is trial infrastructure, not free tier.

### With paid acquisition

| Monthly ad spend | Organic cost | Total cost | Pro conversions | Blended CAC |
| ---------------- | ------------ | ---------- | --------------- | ----------- |
| $0               | $101         | $101       | 8               | $13         |
| $500             | $101         | $601       | 12              | $50         |
| $1,000           | $101         | $1,101     | 16              | $69         |
| $2,000           | $101         | $2,101     | 24              | $88         |
| $5,000           | $101         | $5,101     | 48              | $106        |

Assumes paid traffic converts at the same rate as organic (conservative — paid traffic often converts worse). Each $500 in ad spend drives ~2,500 additional visits → ~4 new Pro users at the 0.16% end-to-end rate.

---

## Lifetime Value

Based on the 1,000-user scenario from the pricing model.

| Metric                 | Conservative | Optimistic |
| ---------------------- | ------------ | ---------- |
| Monthly churn          | 8%           | 5%         |
| Average lifetime       | 12 months    | 20 months  |
| Avg monthly revenue    | $40          | $40        |
| Avg monthly COGS       | $17          | $17        |
| **Avg monthly margin** | **$23**      | **$23**    |
| **Lifetime value**     | **$276**     | **$460**   |

Revenue per Pro user averages $40/mo ($29 base + ~$11 avg overage across all user types). COGS includes Recall, OpenAI, Polar fees, and infra share.

---

## LTV:CAC

The ratio that determines how much we can spend to acquire a customer. 3:1 is the standard SaaS benchmark.

| Scenario      | CAC  | LTV  | Ratio  | Verdict   |
| ------------- | ---- | ---- | ------ | --------- |
| Organic only  | $13  | $276 | 21.2:1 | Excellent |
| $500/mo ads   | $50  | $276 | 5.5:1  | Strong    |
| $1,000/mo ads | $69  | $276 | 4.0:1  | Healthy   |
| $2,000/mo ads | $88  | $276 | 3.1:1  | Threshold |
| $5,000/mo ads | $106 | $276 | 2.6:1  | Risky     |

**Max ad spend at 3:1 target: ~$2,000/mo.** Beyond that, we need better conversion rates to justify spend.

**Max affordable blended CAC: $92** ($276 / 3).

---

## CAC Payback Period

How quickly a new Pro user pays back their acquisition cost.

| Scenario      | CAC | Monthly margin | Payback    |
| ------------- | --- | -------------- | ---------- |
| Organic       | $13 | $23            | < 1 month  |
| $1,000/mo ads | $69 | $23            | 3.0 months |
| $2,000/mo ads | $88 | $23            | 3.8 months |

SaaS benchmark: payback under 12 months is healthy. Under 6 months is strong. Organic payback is essentially instant.

---

## Levers to Improve Economics

**Reduce CAC:**

- Improve visitor → signup rate (better landing page, social proof)
- Improve trial activation (onboarding flow, first-meeting nudges)
- Improve trial → paid (in-trial upgrade prompts, usage alerts near trial end)

**Increase LTV:**

- Reduce churn (better product, engagement emails, usage insights)
- Increase ARPU (users naturally grow into heavier usage over time)
- Annual plans lock in 12 months at slight discount ($24/mo vs $29)

**Reduce organic CAC:**

- Tighten free tier if abuse detected (currently 30 min silent is very cheap)
- Shorten trial from 14 → 7 days if data shows most decisions happen in first week
- Cap trial minutes lower (currently 90 min — could test 60 min)
