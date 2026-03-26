# Vernix Unit Economics

How much it costs to acquire a paying user, what that user is worth, and where to spend on growth.

All numbers reference the [pricing model](./pricing.md): Pro at $29/mo, $30 credit, voice $1.40/hr, silent $0.71/hr.

---

## Inputs

### Cost of serving free users

| User type          | What they consume                          | Cost per user/mo |
| ------------------ | ------------------------------------------ | ---------------- |
| Free (active)      | ~18 min silent (avg, cap is 30)            | $0.21            |
| Free (RAG heavy)   | 20 RAG queries/day × 30 days × $0.01       | $6.00            |
| Free (RAG typical) | ~5 queries/day × 20 days × $0.01           | $1.00            |
| Free trial         | ~30 min voice + ~30 min silent (of 90 cap) | $1.06            |

### Cost of serving Pro users

| User type       | Usage pattern              | COGS/mo | Usage $ | Overage beyond $30 credit |
| --------------- | -------------------------- | ------- | ------- | ------------------------- |
| Light (45%)     | 1 hr voice + 3 hr silent   | $3.53   | $7.50   | $0                        |
| Typical (35%)   | 3 hr voice + 10 hr silent  | $11.30  | $24.00  | $0                        |
| Heavy (15%)     | 8 hr voice + 25 hr silent  | $28.95  | $61.50  | $31.50                    |
| Very heavy (5%) | 25 hr voice + 50 hr silent | $70.50  | $150.00 | $120.00                   |

_COGS = voice hours × $1.40 + silent hours × $0.71. Usage $ = voice hours × $3 + silent hours × $1.50._

### Conversion rates

| Rate                       | Organic   | Paid traffic | Source                          |
| -------------------------- | --------- | ------------ | ------------------------------- |
| Visitor → signup           | 3.0%      | 1.5%         | B2B SaaS avg 2–5%, paid colder  |
| Signup → starts trial      | 50%       | 50%          | Same product, same onboarding   |
| Trial → meaningful use     | 53%       | 40%          | Paid users have weaker intent   |
| Meaningful use → Pro       | 20%       | 15%          | Paid users more price-sensitive |
| **End-to-end visit → Pro** | **0.16%** | **0.045%**   |                                 |

### Other assumptions

| Input                 | Value    | Notes                                 |
| --------------------- | -------- | ------------------------------------- |
| Monthly Pro churn     | 8%       | Conservative for early-stage B2B SaaS |
| Avg Pro lifetime      | 12 mo    | 1 / 0.08 = 12.5, rounded down         |
| Polar fee (monthly)   | $1.56    | $29 × 4% + $0.40                      |
| Polar fee (annual)    | $0.99/mo | $288 × 4% + $0.40 = $11.92/yr         |
| B2B CPC (search ads)  | $5.00    | Google Ads for SaaS keywords          |
| B2B CPC (social ads)  | $2.00    | LinkedIn/Twitter for awareness        |
| B2B CPC (content/SEO) | ~$0      | Organic, no per-click cost            |
| Free user active rate | 50%      | Half of signups use the product       |

---

## Organic Funnel (per 1,000 visitors)

No ad spend. Traffic from SEO, word of mouth, social, content.

| Stage                | Volume  | Rate |
| -------------------- | ------- | ---- |
| Visits               | 1,000   | —    |
| Signups              | 30      | 3.0% |
| Active free users    | 15      | 50%  |
| Start trial          | 15      | 50%  |
| Meaningful trial use | 8       | 53%  |
| **Convert to Pro**   | **1.6** | 20%  |

**Per 1,000 organic visitors → ~1.6 Pro users.**

### Organic cost per 1,000 visitors

| Cost                            | Amount  |
| ------------------------------- | ------- |
| Active free users: 15 × $0.21   | $3.15   |
| Free RAG chat: ~3 users × $1.00 | $3.00   |
| Trial users: 15 × $1.06         | $15.90  |
| **Total**                       | **$22** |
| Pro conversions                 | 1.6     |
| **Organic CAC**                 | **$14** |

The organic CAC is $14 regardless of how many visitors we get — it scales linearly. Whether we get 100 or 100,000 visitors/month, each Pro user costs ~$14 in free tier and trial infrastructure.

---

## Paid Funnel (per $1,000 ad spend)

| Channel        | CPC   | Visits | Signups (1.5%) | Trials (50%) | Active (40%) | Pro (15%) | CAC per user  |
| -------------- | ----- | ------ | -------------- | ------------ | ------------ | --------- | ------------- |
| Google Search  | $5.00 | 200    | 3              | 1.5          | 0.6          | 0.09      | $11,111       |
| LinkedIn       | $2.00 | 500    | 7.5            | 3.75         | 1.5          | 0.23      | $4,348        |
| Social (cheap) | $0.50 | 2,000  | 30             | 15           | 6            | 0.9       | $1,111        |
| Content/SEO    | ~$0   | —      | —              | —            | —            | —         | ~$0 (organic) |

**Paid ads are not viable at current conversion rates.** Even cheap social traffic at $0.50 CPC produces $1,111 CAC — far above the ~$246 LTV.

### When paid ads become worth it

For a paid channel to hit 3:1 LTV:CAC, the ad spend CAC must stay under **$82** (LTV $246 / 3). That means:

| CPC   | Required visit-to-Pro rate | What that means                                   |
| ----- | -------------------------- | ------------------------------------------------- |
| $5.00 | 6.10%                      | 1 in 16 visitors converts. Unrealistic.           |
| $2.00 | 2.44%                      | 1 in 41 visitors. Very optimistic.                |
| $1.00 | 1.22%                      | 1 in 82 visitors. Achievable with great funnel.   |
| $0.50 | 0.61%                      | 1 in 164 visitors. Realistic target.              |
| $0.20 | 0.24%                      | 1 in 410 visitors. Close to current organic rate. |

_Formula: required rate = CPC / $82. At $82 CAC and the given CPC, you need that % of visitors to become Pro._

**Realistic path to paid ads:**

1. Optimize funnel to 0.5%+ visit-to-Pro (3x current organic rate)
2. Find channels with CPC ≤ $0.50 (retargeting, social content, niche communities)
3. Start small ($500/mo), measure actual CAC, scale only if 3:1 holds

**Channels most likely to work first:**

- Retargeting existing visitors ($0.20–0.50 CPC, higher intent = better conversion)
- Social content promotion ($0.30–1.00 CPC on Twitter/Reddit)
- Referral program (no CPC — reward cost per signup only)
- Product-led viral: meeting participants see Vernix → organic signups at $0 CPC

---

## Lifetime Value

### Per-user revenue and margin

| User type  | % of Pro | Revenue/mo | COGS/mo | Polar/mo | Margin/mo |
| ---------- | -------- | ---------- | ------- | -------- | --------- |
| Light      | 45%      | $29.00     | $3.53   | $1.56    | $23.91    |
| Typical    | 35%      | $29.00     | $11.30  | $1.56    | $16.14    |
| Heavy      | 15%      | $60.50     | $28.95  | $3.22    | $28.33    |
| Very heavy | 5%       | $149.00    | $70.50  | $6.76    | $71.74    |

_Heavy/very heavy revenue = $29 base + overage. Heavy Polar = $1.56 base + $1.66 overage. Very heavy Polar = $1.56 base + $5.20 overage._

### Lifetime value (at 8% monthly churn = 12 month avg lifetime)

| Metric         | Median (80% of users) | Mean (all users) |
| -------------- | --------------------- | ---------------- |
| Monthly margin | $20.51                | $24.25           |
| **LTV**        | **$246**              | **$291**         |

_Median = weighted avg of light ($23.91) and typical ($16.14) at 56/44 split within the 80%. Mean = 0.45 x $23.91 + 0.35 x $16.14 + 0.15 x $28.33 + 0.05 x $71.74._

---

## Summary

| Metric            | Value          |
| ----------------- | -------------- |
| Organic CAC       | $14            |
| LTV (median)      | $246           |
| LTV:CAC (organic) | 17.6:1         |
| Payback period    | < 1 month      |
| Paid ads viable?  | No (at launch) |
| Break-even CPC    | < $0.10        |

Organic unit economics are strong. Every $14 spent serving free/trial users returns $246 in lifetime margin. The focus at launch should be entirely on driving organic traffic and optimizing the conversion funnel — not paid ads.

---

## Levers

**Improve conversion (highest impact):**

- Visitor → signup: landing page optimization, social proof, demo video
- Signup → trial: reduce friction, auto-join a demo meeting on signup
- Trial → paid: upgrade prompts, usage alerts near 90 min cap, show value delivered

**Reduce organic CAC:**

- Tighten free RAG limit if abused (20/day → 10/day)
- Shorten trial (14 → 7 days) if data shows fast decisions
- Block disposable email domains from trial

**Increase LTV:**

- Reduce churn with engagement emails, usage insights
- Annual plans ($24/mo) lock in 12 months and reduce Polar fees
- Users naturally grow into heavier usage over time

**Unlock paid acquisition (later):**

- Content marketing and SEO (near-zero CPC)
- Referral program (existing users invite colleagues, reward both)
- Product-led viral loop: meeting participants see Vernix agent in action → organic signups
- Revisit paid ads once visit-to-Pro exceeds 1%
