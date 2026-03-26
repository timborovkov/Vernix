# Vernix Pricing Model

> Hybrid plan + usage-based billing. Base plans unlock features and include usage credits; overflow is billed per-hour. Always profitable at every usage level.

---

## Cost Basis

### Voice Meeting — Wake-on-Demand (default) — ~$1.40/hr

Wake-on-demand: wake-word detection on transcript stream, Realtime API spins up only when addressed. Conservative estimate: ~8 activations/hr, ~45 sec avg (includes session spin-up, warm pool overhead) = ~6 min of Realtime per hour.

| Cost Item                          | Detail                                           | Cost   |
| ---------------------------------- | ------------------------------------------------ | ------ |
| Recall bot                         | $0.50/hr recording                               | $0.50  |
| Recall transcription               | $0.15/hr                                         | $0.15  |
| OpenAI Realtime (gpt-realtime-1.5) | ~6 min/hr on-demand (8 × 45s avg incl. overhead) | ~$0.70 |
| Embeddings + Summary + Tasks       | Transcript chunks, post-meeting processing       | ~$0.01 |
| Warm pool / session overhead       | Pre-initialized sessions, idle keepalive         | ~$0.04 |

### Voice Meeting — Always-On — ~$7.66/hr

Realtime API connected for full meeting duration. Opt-in for users who want continuous voice interaction.

| Cost Item                          | Detail                          | Cost   |
| ---------------------------------- | ------------------------------- | ------ |
| Recall bot + transcription         | $0.65/hr combined               | $0.65  |
| OpenAI Realtime (gpt-realtime-1.5) | ~60 min listen, ~10 min speak   | ~$7.00 |
| Embeddings + Summary + Tasks       | Transcript chunks, post-meeting | ~$0.01 |

### Silent Mode Meeting — ~$0.71/hr

| Cost Item                    | Detail                      | Cost   |
| ---------------------------- | --------------------------- | ------ |
| Recall bot + transcription   | $0.65/hr combined           | $0.65  |
| Embeddings + Summary + Tasks | Post-meeting processing     | ~$0.01 |
| Silent agent responses       | 0-5 responses @ ~$0.01 each | $0.05  |

### Post-Meeting Chat — ~$0.01/query

| Cost Item           | Detail                  | Cost      |
| ------------------- | ----------------------- | --------- |
| RAG query (gpt-5.4) | ~2K tokens in, ~500 out | ~$0.01    |
| Embedding           | 1 per query             | ~$0.00001 |

### Infrastructure Per-User (monthly)

Railway is shared infrastructure (Next.js + Postgres + Qdrant + Minio). Cost is mostly fixed — marginal per-user cost is incremental DB rows and vector storage.

| Item                                             | Cost                              |
| ------------------------------------------------ | --------------------------------- |
| Railway (shared, marginal per-user)              | ~$0.02–0.10 (at 100+ users)       |
| Resend (transactional emails, ~3 emails/user/mo) | ~$0.002                           |
| Polar (4% + $0.40 per transaction)               | Per billing event                 |
| **Total infra per user**                         | **~$0.03–0.10** (excluding Polar) |

### Source Pricing References

- **Recall.ai**: $0.50/hr recording + $0.15/hr transcription (recall.ai/pricing)
- **OpenAI Realtime**: ~$7/hr estimated for gpt-realtime-1.5 (verify at platform.openai.com/docs/pricing)
- **OpenAI Embeddings**: text-embedding-3-small @ $0.02/1M tokens
- **OpenAI Chat**: gpt-5.4-mini @ ~$0.15/$0.60 per 1M tokens (in/out), gpt-5.4 @ ~$2.50/$10 per 1M tokens
- **Polar**: 4% + $0.40 per transaction, no monthly fees
- **Railway**: ~$0.028/vCPU/hr, $0.014/GB RAM/hr, Pro plan $20/mo base
- **Resend**: Free 3K emails/mo, Pro $20/mo for 50K emails

---

## Pricing Tiers

### Free (permanent)

- 2 silent meetings/month (no voice), max 1 hr each
- Summaries, tasks, RAG chat included
- 5 documents in knowledge base
- **Cost to us:** ~$1.42/mo per active user

### Free Trial (14 days, on top of Free)

- Full Pro features including voice mode
- 3 meetings max, 1 hour each
- Auto-activates on signup
- **Max CAC:** ~$23 (if all 3 meetings use voshice)

### Pro — $24/month

- All features unlocked (voice + silent + full RAG chat)
- **$20 usage credit included** per month (does not roll over)
- 50 documents in knowledge base
- **Annual: $19/mo** (billed $228/yr — 21% discount)

### Max — $49/month

- Everything in Pro, plus:
- **$60 usage credit included** per month (does not roll over)
- 200 knowledge base documents, 25 MB max doc size, 2 GB storage
- API access, MCP server & client
- Higher limits: 4 hr max meeting, 5 concurrent meetings, unlimited RAG chat
- Priority support
- **Annual: $39/mo** (billed $468/yr — 20% discount)

### Usage Rates (all paid plans)

| Meeting Type                   | User Price   | Our Cost | Margin |
| ------------------------------ | ------------ | -------- | ------ |
| Voice meeting (wake-on-demand) | **$3/hr**    | ~$1.40   | 53.3%  |
| Voice meeting (always-on)      | **$10/hr**   | ~$7.66   | 23.4%  |
| Silent meeting                 | **$1.50/hr** | ~$0.71   | 52.7%  |
| Post-meeting chat              | **Free**     | ~$0.01   | Incl.  |

Credits are consumed at these rates. Once exhausted, the same rates apply as metered overage.

---

## Hard Caps & Limits

### Per-Plan Limits

| Limit                           | Free          | Free Trial (14d) | Pro           | Max           |
| ------------------------------- | ------------- | ---------------- | ------------- | -------------- |
| **Meetings/month**              | 2             | 3 (total)        | 30            | 100            |
| **Max meeting duration**        | 1 hr          | 1 hr             | 2 hrs         | 4 hrs          |
| **Voice mode**                  | No            | Yes              | Yes           | Yes            |
| **Silent mode**                 | Yes           | Yes              | Yes           | Yes            |
| **Knowledge base documents**    | 5             | 50               | 50            | 200            |
| **Max document size**           | 10 MB         | 10 MB            | 10 MB         | 25 MB          |
| **Max chunks per document**     | 500           | 500              | 500           | 500            |
| **Total storage**               | 50 MB         | 500 MB           | 500 MB        | 2 GB           |
| **RAG chat queries/day**        | 20            | 100              | 100           | Unlimited      |
| **Meeting-scoped documents**    | 1 per meeting | 5 per meeting    | 5 per meeting | 10 per meeting |
| **Concurrent active meetings**  | 1             | 1                | 2             | 5              |
| **API access**                  | No            | No               | No            | Yes            |
| **MCP server (expose data)**    | No            | No               | No            | Yes            |
| **MCP client (external tools)** | No            | No               | No            | Yes            |
| **Monthly spending cap**        | N/A           | N/A              | Optional      | Optional       |

### Universal Limits (all plans)

- **Supported document types:** PDF, DOCX, TXT, MD
- **Max filename length:** 255 characters
- **Chunk size:** 1,000 chars with 200-char overlap (fixed, not configurable)
- **Max chunks per document:** 500 (~500K chars / ~125 pages of text)
- **Transcript embedding:** Real-time, 1 embedding per utterance chunk
- **Silent agent rate limit:** 1 response per 30 seconds per meeting
- **Voice agent:** Runs for full meeting duration (billed per-minute)

### Enforcement Behavior

- **Meeting cap reached:** User cannot start new meetings until next billing cycle. In-progress meetings are never interrupted.
- **Duration cap reached:** Bot auto-leaves at the cap. User gets a 5-minute warning.
- **Document cap reached:** Upload blocked with clear error message.
- **Storage cap reached:** Upload blocked. User must delete old documents or upgrade.
- **Credit exhausted:** Meeting continues; overage is billed. Spending cap (if set) triggers bot auto-leave.
- **Chat query limit reached (Free):** Blocked until next day with upgrade prompt.

---

## Margin Analysis

### Polar Fee on Base Plans

| Plan         | Monthly Price | Polar Fee (4% + $0.40) | Net Base Revenue |
| ------------ | ------------- | ---------------------- | ---------------- |
| Pro monthly  | $24           | $1.36                  | $22.64           |
| Pro annual   | $19 eff.      | $1.16 eff.             | $17.84 eff.      |
| Max monthly | $49           | $2.36                  | $46.64           |
| Max annual  | $39 eff.      | $1.96 eff.             | $37.04 eff.      |

_Polar also charges 4% + $0.40 on each overage invoice._

### Pro $24/mo Scenarios (wake-on-demand voice)

**Light (1 hr voice + 3 hr silent):**

- Usage: 1×$3 + 3×$1.50 = $7.50 → within $20 credit, no overage
- Revenue: $22.64 | Cost: 1×$1.40 + 3×$0.71 + $0.10 = $3.63
- **Margin: $19.01 (84.0%)**

**Typical (3 hr voice + 10 hr silent):**

- Usage: 3×$3 + 10×$1.50 = $24.00 → $20 credit, $4 overage
- Overage Polar: $4 × 0.04 + $0.40 = $0.56
- Revenue: $22.64 + $4.00 - $0.56 = $26.08 | Cost: 3×$1.40 + 10×$0.71 + $0.10 = $11.40
- **Margin: $14.68 (56.3%)**

**Heavy (8 hr voice + 25 hr silent):**

- Usage: 8×$3 + 25×$1.50 = $61.50 → $20 credit, $41.50 overage
- Overage Polar: $41.50 × 0.04 + $0.40 = $2.06
- Revenue: $22.64 + $41.50 - $2.06 = $62.08 | Cost: 8×$1.40 + 25×$0.71 + $0.10 = $28.05
- **Margin: $34.03 (54.8%)**

### Max $49/mo Scenarios (wake-on-demand voice)

**Light (3 hr voice + 10 hr silent):**

- Usage: $24.00 → within $60 credit, no overage
- Revenue: $46.64 | Cost: 3×$1.40 + 10×$0.71 + $0.10 = $11.40
- **Margin: $35.24 (75.6%)**

**Typical (10 hr voice + 30 hr silent):**

- Usage: 10×$3 + 30×$1.50 = $75.00 → $60 credit, $15 overage
- Overage Polar: $15 × 0.04 + $0.40 = $1.00
- Revenue: $46.64 + $15.00 - $1.00 = $60.64 | Cost: 10×$1.40 + 30×$0.71 + $0.10 = $35.40
- **Margin: $25.24 (41.6%)**

**Heavy (25 hr voice + 50 hr silent):**

- Usage: 25×$3 + 50×$1.50 = $150.00 → $60 credit, $90 overage
- Overage Polar: $90 × 0.04 + $0.40 = $4.00
- Revenue: $46.64 + $90.00 - $4.00 = $132.64 | Cost: 25×$1.40 + 50×$0.71 + $0.10 = $70.60
- **Margin: $62.04 (46.8%)**

---

## 1,000-User Scenario (Conservative)

Simulated monthly snapshot at 1,000 registered users. Most free users are inactive, paid users skew light, Max users skew heavier.

### User Distribution

| Segment             | Users     | Voice/mo | Silent/mo | Cost/user | Usage $ | Credit | Overage |
| ------------------- | --------- | -------- | --------- | --------- | ------- | ------ | ------- |
| **Free (inactive)** | 550       | —        | —         | $0        | —       | —      | —       |
| **Free (active)**   | 300       | 0 hr     | 1.5 hr    | $1.07     | —       | —      | —       |
| **Pro (light)**     | 55        | 1 hr     | 3 hr      | $3.53     | $7.50   | $20    | $0      |
| **Pro (typical)**   | 45        | 3 hr     | 10 hr     | $11.30    | $24.00  | $20    | $4      |
| **Pro (heavy)**     | 20        | 8 hr     | 25 hr     | $28.95    | $61.50  | $20    | $41.50  |
| **Max (light)**    | 8         | 3 hr     | 10 hr     | $11.30    | $24.00  | $60    | $0      |
| **Max (typical)**  | 15        | 10 hr    | 30 hr     | $35.30    | $75.00  | $60    | $15     |
| **Max (heavy)**    | 7         | 25 hr    | 50 hr     | $70.50    | $150.00 | $60    | $90     |
| **Total**           | **1,000** |          |           |           |         |        |         |

_Voice at $1.40/hr (wake-on-demand), silent at $0.71/hr. Usage rates: voice $3/hr, silent $1.50/hr. Cost/user includes $0.10 infra._

### Revenue

| Line item            | Calculation       | Amount     |
| -------------------- | ----------------- | ---------- |
| Pro base (120 × $24) |                   | $2,880     |
| Max base (30 × $49) |                   | $1,470     |
| Pro overage          | 45×$4 + 20×$41.50 | $1,010     |
| Max overage         | 15×$15 + 7×$90    | $855       |
| **Gross revenue**    |                   | **$6,215** |

### Costs

| Line item          | Calculation                              | Amount     |
| ------------------ | ---------------------------------------- | ---------- |
| Free active        | 300 × $1.07                              | $321       |
| Pro light          | 55 × $3.53                               | $194       |
| Pro typical        | 45 × $11.30                              | $509       |
| Pro heavy          | 20 × $28.95                              | $579       |
| Max light         | 8 × $11.30                               | $90        |
| Max typical       | 15 × $35.30                              | $530       |
| Max heavy         | 7 × $70.50                               | $494       |
| **Subtotal usage** |                                          | **$2,717** |
| Polar on base      | 120×$1.36 + 30×$2.36                     | $234       |
| Polar on overage   | 45×$0.56 + 20×$2.06 + 15×$1.00 + 7×$4.00 | $109       |
| Infrastructure     |                                          | $120       |
| **Total cost**     |                                          | **$3,180** |

### Summary

| Metric            | Amount                 |
| ----------------- | ---------------------- |
| **Gross revenue** | **$6,215**             |
| **Total cost**    | **$3,180**             |
| **Net margin**    | **$3,035**             |
| **Margin %**      | **48.8%**              |
| Revenue per user  | $6.22                  |
| Cost per user     | $3.18                  |
| Free user drag    | $321 (5.2% of revenue) |

### Takeaways

- Heavy Max users do 25 hr voice + 50 hr silent/mo (realistic for daily meeting power users) and still generate $62/mo margin each
- Voice at $1.40/hr (2x silent cost) creates meaningful differentiation while staying profitable at 53% per-hour margin
- Free user cost ($321/mo for 300 active) is easily covered by ~7 Pro subscriptions
- Overage from heavy users ($1,865/mo) is a significant revenue driver at ~49% margin after Polar fees

---

## Safeguards

1. **Always profitable** — Usage-based billing means costs scale with revenue. No "unlimited" anything for expensive resources.
2. **Credits don't roll over** — Prevents credit hoarding; base fee is always recurring revenue.
3. **Free tier is silent-only** — Voice (the expensive part) requires a paid plan.
4. **Spending alerts** — Notify users at 80% and 100% credit usage.
5. **Monthly spending caps** — Users can set optional max spend to avoid surprise bills.
6. **Fair use** — Disproportionate single-user load triggers Enterprise conversation.
7. **Monitor OpenAI pricing** — As Realtime API prices drop over time, either improve margins or reduce voice rate to grow volume.

---

## Future Implementation

- Polar product setup (Pro monthly/annual, Max monthly/annual, metered usage products)
- Usage tracking per user per billing period (voice hours, silent hours)
- Credit balance and overage calculation logic
- Spending alerts (80%, 100% of credits)
- Optional per-user spending caps
- Free tier enforcement (2 silent meetings/mo, no voice)
- Trial activation (14 days) and expiry logic
- Dashboard usage meter UI
