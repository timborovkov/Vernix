# Vernix Pricing Model

> Hybrid plan + usage-based billing. One paid plan unlocks everything with included credits; overflow is billed per-hour.

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
| Railway (shared, marginal per-user)              | ~$0.02–0.10 (at 100+ users)      |
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

- Silent meeting agent (no voice)
- Summaries, tasks, RAG chat
- Knowledge base uploads
- **Cost to us:** ~$0.36/mo per active user (0.5 hr × $0.71)

### Free Trial (14 days, on top of Free)

- Full Pro features including voice mode
- 90 minutes total (voice or silent)
- Auto-activates on signup
- **Max CAC:** ~$2.10 (1.5 hrs wake-on-demand voice × $1.40)

### Pro — $29/month

- Voice + silent meeting agent
- **$30 usage credit included** per month (does not roll over)
- Knowledge base, RAG chat, API, MCP
- **Annual: $24/mo** (billed $288/yr — 17% discount)

### Usage Rates

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

| Limit                           | Free          | Free Trial (14d) | Pro            |
| ------------------------------- | ------------- | ---------------- | -------------- |
| **Voice minutes/month**         | 0             | 90 (trial total) | By credits (~10 hrs at $3/hr) |
| **Silent minutes/month**        | 30            | 90 (trial total) | By credits (~20 hrs at $1.50/hr) |
| **Knowledge base documents**    | 5             | 200              | 200            |
| **Max document size**           | 10 MB         | 25 MB            | 25 MB          |
| **Doc uploads/month**           | 5             | 30               | 50             |
| **Total storage**               | 50 MB         | 500 MB           | 500 MB         |
| **Max chunks per document**     | 500           | 500              | 500            |
| **RAG chat queries/day**        | 20            | 200              | 200            |
| **Meeting-scoped documents**    | 1 per meeting | 10 per meeting   | 10 per meeting |
| **Concurrent active meetings**  | 1             | 5                | 5              |
| **API requests/day**            | No            | 1,000            | 1,000          |
| **MCP server connections**      | No            | 5                | 5              |
| **MCP client connections**      | No            | 10               | 10             |
| **Monthly spending cap**        | N/A           | N/A              | Optional       |
| **Meetings/month (anti-abuse)** | 5             | 20               | 500            |

### Universal Limits

- **Supported document types:** PDF, DOCX, TXT, MD
- **Max filename length:** 255 characters
- **Chunk size:** 1,000 chars with 200-char overlap (fixed, not configurable)
- **Max chunks per document:** 500 (~500K chars / ~125 pages of text)
- **Transcript embedding:** Real-time, 1 embedding per utterance chunk
- **Silent agent rate limit:** 1 response per 30 seconds per meeting
- **Voice agent:** Billed per-minute of active meeting time

### Enforcement

- **Free minutes exhausted:** Cannot start new meetings until next cycle. In-progress meetings are never interrupted.
- **Trial minutes exhausted or trial expired:** User falls back to Free limits (30 min silent, no voice). Upgrade prompt shown. Any in-progress meeting finishes but no new voice meetings can start.
- **Credits exhausted (paid):** Meeting continues; overage is billed. Spending cap (if set) triggers bot auto-leave with 5-minute warning.
- **Document/storage cap:** Upload blocked with upgrade prompt.
- **Chat/API limit reached:** Blocked until next day.
- **Anti-abuse cap:** Meeting creation blocked. Should never trigger under normal use.

---

## Margin Analysis

### Polar Fees

| Plan       | Monthly Price | Polar Fee (4% + $0.40) | Net Base Revenue |
| ---------- | ------------- | ---------------------- | ---------------- |
| Pro monthly| $29           | $1.56                  | $27.44           |
| Pro annual | $24 eff.      | $1.36 eff.             | $22.64 eff.      |

*Polar also charges 4% + $0.40 on each overage invoice.*

### Pro $29/mo Scenarios (wake-on-demand voice)

**Light (1 hr voice + 3 hr silent):**
- Usage: 1×$3 + 3×$1.50 = $7.50 → within $30 credit, no overage
- Revenue: $27.44 | Cost: 1×$1.40 + 3×$0.71 + $0.10 = $3.53
- **Margin: $23.91 (87.1%)**

**Typical (3 hr voice + 10 hr silent):**
- Usage: 3×$3 + 10×$1.50 = $24.00 → within $30 credit, no overage
- Revenue: $27.44 | Cost: 3×$1.40 + 10×$0.71 + $0.10 = $11.40
- **Margin: $16.04 (58.5%)**

**Heavy (8 hr voice + 25 hr silent):**
- Usage: 8×$3 + 25×$1.50 = $61.50 → $30 credit, $31.50 overage
- Overage Polar: $31.50 × 0.04 + $0.40 = $1.66
- Revenue: $27.44 + $31.50 - $1.66 = $57.28 | Cost: 8×$1.40 + 25×$0.71 + $0.10 = $28.05
- **Margin: $29.23 (51.0%)**

**Very heavy (25 hr voice + 50 hr silent):**
- Usage: 25×$3 + 50×$1.50 = $150.00 → $30 credit, $120 overage
- Overage Polar: $120 × 0.04 + $0.40 = $5.20
- Revenue: $27.44 + $120.00 - $5.20 = $142.24 | Cost: 25×$1.40 + 50×$0.71 + $0.10 = $70.60
- **Margin: $71.64 (50.4%)**

---

## 1,000-User Scenario (Conservative)

Simulated monthly snapshot at 1,000 registered users. 80% free (including trialists), 20% paid (single Pro plan).

### User Distribution

| Segment              | Users     | Voice/mo | Silent/mo | Cost/user | Usage $  | Credit | Overage |
| -------------------- | --------- | -------- | --------- | --------- | -------- | ------ | ------- |
| **Free (inactive)**  | 480       | —        | —         | $0        | —        | —      | —       |
| **Free (active)**    | 270       | 0 hr     | 0.3 hr    | $0.21     | —        | —      | —       |
| **Free trial**       | 50        | 0.5 hr   | 0.5 hr    | $1.06     | —        | —      | —       |
| **Pro (light)**      | 90        | 1 hr     | 3 hr      | $3.53     | $7.50    | $30    | $0      |
| **Pro (typical)**    | 70        | 3 hr     | 10 hr     | $11.30    | $24.00   | $30    | $0      |
| **Pro (heavy)**      | 30        | 8 hr     | 25 hr     | $28.95    | $61.50   | $30    | $31.50  |
| **Pro (very heavy)** | 10        | 25 hr    | 50 hr     | $70.50    | $150.00  | $30    | $120    |
| **Total**            | **1,000** |          |           |           |          |        |         |

*800 free (480 inactive + 270 active + 50 trial), 200 Pro. Voice at $1.40/hr, silent at $0.71/hr. Cost/user includes $0.10 infra. Trial users have Pro features for 14 days — cost but no revenue. Light and typical Pro users stay within $30 credit.*

### Revenue

| Line item             | Calculation           | Amount     |
| --------------------- | --------------------- | ---------- |
| Pro base (200 × $29)  |                       | $5,800     |
| Pro overage            | 30×$31.50 + 10×$120  | $2,145     |
| **Gross revenue**      |                       | **$7,945** |

### Costs

| Line item          | Calculation                          | Amount     |
| ------------------ | ------------------------------------ | ---------- |
| Free active        | 270 × $0.21                         | $57        |
| Free trial         | 50 × $1.06                          | $53        |
| Pro light          | 90 × $3.53                          | $318       |
| Pro typical        | 70 × $11.30                         | $791       |
| Pro heavy          | 30 × $28.95                         | $869       |
| Pro very heavy     | 10 × $70.50                         | $705       |
| **Subtotal usage** |                                      | **$2,793** |
| Polar on base      | 200 × $1.56                         | $312       |
| Polar on overage   | 30×$1.66 + 10×$5.20                 | $102       |
| Infrastructure     |                                      | $120       |
| **Total cost**     |                                      | **$3,327** |

### Summary

| Metric            | Amount                  |
| ----------------- | ----------------------- |
| **Gross revenue** | **$7,945**              |
| **Total cost**    | **$3,327**              |
| **Net margin**    | **$4,618**              |
| **Margin %**      | **58.1%**               |
| Revenue per user  | $7.95                   |
| Cost per user     | $3.33                   |
| Free user drag    | $110 (1.4% of revenue)  |

### Takeaways

- Single plan simplifies the funnel: Free → Trial → Pro. No tier comparison needed.
- $30 credit covers light and typical users — predictable $29/mo bill for 80% of paid users.
- Heavy users generate overage at ~50% margin. Very heavy users are the most profitable segment.
- 57.5% margin is stronger than the two-tier model — single $29 price captures more from light users.

---

## Safeguards

1. **Always profitable** — Usage-based billing means costs scale with revenue.
2. **Credits don't roll over** — Base fee is always recurring revenue.
3. **Free tier is silent-only** — Voice requires Pro.
4. **Spending alerts** — Notify at 80% and 100% credit usage.
5. **Optional spending caps** — Users set max monthly spend to prevent bill shock.
6. **Fair use** — Disproportionate load triggers Enterprise conversation.
7. **Monitor OpenAI pricing** — As Realtime API prices drop, improve margins or reduce rates.

---

## Future Implementation

- Polar product setup (Pro monthly/annual, metered usage)
- Usage tracking per user per billing period (voice minutes, silent minutes)
- Credit balance and overage calculation logic
- Spending alerts (80%, 100% of credits)
- Optional per-user spending caps
- Free tier enforcement (30 silent min/mo, no voice, no API/MCP)
- Trial activation (14 days) and expiry logic
- Dashboard usage meter UI
- API rate limiting per API key (1,000 req/day)
- MCP connection limits enforcement
- **Downgrade enforcement** — When users cancel Pro → Free: read-only access to excess documents, block new uploads until under cap, show re-subscribe prompt
- **Account garbage collection** — Periodic cleanup for dormant accounts: archive Qdrant collections and S3 objects for users inactive 90+ days, delete after 180 days with prior email warning. Reclaim storage from cancelled accounts exceeding Free limits after grace period.
