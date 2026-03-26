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

- 30 silent minutes/month (no voice)
- Summaries, tasks, RAG chat included
- 5 documents in knowledge base
- **Cost to us:** ~$0.36/mo per active user (0.5 hr × $0.71)

### Free Trial (14 days, on top of Free)

- Full Pro features including voice mode
- 180 minutes total (voice or silent)
- Auto-activates on signup
- **Max CAC:** ~$3 (3 hrs wake-on-demand voice × $1.40)

### Pro — $24/month

- All features unlocked (voice + silent + full RAG chat)
- **$20 usage credit included** per month (does not roll over)
- 50 documents in knowledge base
- **Annual: $19/mo** (billed $228/yr — 21% discount)

### Max — $49/month

- Everything in Pro, plus:
- **$60 usage credit included** per month (does not roll over)
- 200 knowledge base documents, 25 MB max doc size
- API access, MCP server & client
- Higher limits: 5 concurrent meetings, 200 RAG chat queries/day
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


| Limit                           | Free          | Free Trial (14d) | Pro           | Max            |
| ------------------------------- | ------------- | ---------------- | ------------- | -------------- |
| **Voice minutes/month**         | 0             | 180 (shared)     | By credits    | By credits     |
| **Silent minutes/month**        | 30            | 180 (shared)     | By credits    | By credits     |
| **Knowledge base documents**    | 5             | 50               | 50            | 200            |
| **Max document size**           | 10 MB         | 10 MB            | 10 MB         | 25 MB          |
| **Doc uploads/month**           | 5             | 20               | 30            | 100            |
| **Total storage**               | 50 MB         | 250 MB           | 250 MB        | 1 GB           |
| **Max chunks per document**     | 500           | 500              | 500           | 500            |
| **RAG chat queries/day**        | 20            | 100              | 100           | 200            |
| **Meeting-scoped documents**    | 1 per meeting | 5 per meeting    | 5 per meeting | 10 per meeting |
| **Concurrent active meetings**  | 1             | 1                | 2             | 5              |
| **API access**                  | No            | No               | No            | Yes            |
| **MCP server (expose data)**    | No            | No               | No            | Yes            |
| **MCP client (external tools)** | No            | No               | No            | Yes            |
| **Monthly spending cap**        | N/A           | N/A              | Optional      | Optional       |
| **Meetings/month (anti-abuse)** | 5             | 10               | 200           | 500            |


### Universal Limits (all plans)

- **Supported document types:** PDF, DOCX, TXT, MD
- **Max filename length:** 255 characters
- **Chunk size:** 1,000 chars with 200-char overlap (fixed, not configurable)
- **Max chunks per document:** 500 (~500K chars / ~125 pages of text)
- **Transcript embedding:** Real-time, 1 embedding per utterance chunk
- **Silent agent rate limit:** 1 response per 30 seconds per meeting
- **Voice agent:** Billed per-minute of active meeting time

### Enforcement Behavior

- **Meeting cap reached:** User cannot start new meetings until next billing cycle. In-progress meetings are never interrupted.
- **Credits exhausted (paid):** Meeting continues; overage is billed. Spending cap (if set) triggers bot auto-leave with 5-minute warning.
- **Document cap reached:** Upload blocked with upgrade prompt.
- **Chat query limit reached (Free):** Blocked until next day with upgrade prompt.

---

## Margin Analysis

### Polar Fee on Base Plans


| Plan        | Monthly Price | Polar Fee (4% + $0.40) | Net Base Revenue |
| ----------- | ------------- | ---------------------- | ---------------- |
| Pro monthly | $24           | $1.36                  | $22.64           |
| Pro annual  | $19 eff.      | $1.16 eff.             | $17.84 eff.      |
| Max monthly | $49           | $2.36                  | $46.64           |
| Max annual  | $39 eff.      | $1.96 eff.             | $37.04 eff.      |


*Polar also charges 4% + $0.40 on each overage invoice.*

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

Simulated monthly snapshot at 1,000 registered users. 80% free (including trialists), 20% paid.

### User Distribution


| Segment             | Users     | Voice/mo | Silent/mo | Cost/user | Usage $ | Credit | Overage |
| ------------------- | --------- | -------- | --------- | --------- | ------- | ------ | ------- |
| **Free (inactive)** | 480       | —        | —         | $0        | —       | —      | —       |
| **Free (active)**   | 270       | 0 hr     | 0.3 hr    | $0.21     | —       | —      | —       |
| **Free trial**      | 50        | 1 hr     | 1 hr      | $2.11     | —       | —      | —       |
| **Pro (light)**     | 75        | 1 hr     | 3 hr      | $3.53     | $7.50   | $20    | $0      |
| **Pro (typical)**   | 55        | 3 hr     | 10 hr     | $11.30    | $24.00  | $20    | $4      |
| **Pro (heavy)**     | 30        | 8 hr     | 25 hr     | $28.95    | $61.50  | $20    | $41.50  |
| **Max (light)**     | 12        | 3 hr     | 10 hr     | $11.30    | $24.00  | $60    | $0      |
| **Max (typical)**   | 18        | 10 hr    | 30 hr     | $35.30    | $75.00  | $60    | $15     |
| **Max (heavy)**     | 10        | 25 hr    | 50 hr     | $70.50    | $150.00 | $60    | $90     |
| **Total**           | **1,000** |          |           |           |         |        |         |


*800 free (480 inactive + 270 active + 50 trial), 160 Pro, 40 Max. Voice at $1.40/hr, silent at $0.71/hr. Cost/user includes $0.10 infra. Trial users have Pro features for 14 days — they cost us but generate $0 revenue.*

### Revenue


| Line item            | Calculation       | Amount     |
| -------------------- | ----------------- | ---------- |
| Pro base (160 × $24) |                   | $3,840     |
| Max base (40 × $49)  |                   | $1,960     |
| Pro overage          | 55×$4 + 30×$41.50 | $1,465     |
| Max overage          | 18×$15 + 10×$90   | $1,170     |
| **Gross revenue**    |                   | **$8,435** |


### Costs


| Line item          | Calculation                               | Amount     |
| ------------------ | ----------------------------------------- | ---------- |
| Free active        | 270 × $0.21                               | $57        |
| Free trial         | 50 × $2.11                                | $106       |
| Pro light          | 75 × $3.53                                | $265       |
| Pro typical        | 55 × $11.30                               | $622       |
| Pro heavy          | 30 × $28.95                               | $869       |
| Max light          | 12 × $11.30                               | $136       |
| Max typical        | 18 × $35.30                               | $635       |
| Max heavy          | 10 × $70.50                               | $705       |
| **Subtotal usage** |                                           | **$3,395** |
| Polar on base      | 160×$1.36 + 40×$2.36                      | $312       |
| Polar on overage   | 55×$0.56 + 30×$2.06 + 18×$1.00 + 10×$4.00 | $151       |
| Infrastructure     |                                           | $120       |
| **Total cost**     |                                           | **$3,978** |


### Summary


| Metric            | Amount                 |
| ----------------- | ---------------------- |
| **Gross revenue** | **$8,435**             |
| **Total cost**    | **$3,978**             |
| **Net margin**    | **$4,457**             |
| **Margin %**      | **52.8%**              |
| Revenue per user  | $8.44                  |
| Cost per user     | $3.98                  |
| Free user drag    | $163 (1.9% of revenue) |


### Takeaways

- Free trial users cost $106/mo total — acceptable CAC if even 20% convert to Pro ($24/mo payback in first month)
- Heavy Max users do 25 hr voice + 50 hr silent/mo and still generate $62/mo margin each
- Overage from heavy users ($2,635/mo) is a major revenue driver at ~52% margin after Polar fees
- Free tier at 30 min silent is cheap enough ($163/mo for 320 active+trial users) to be negligible

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
- Usage tracking per user per billing period (voice minutes, silent minutes)
- Credit balance and overage calculation logic
- Spending alerts (80%, 100% of credits)
- Optional per-user spending caps
- Free tier enforcement (30 silent min/mo, no voice)
- Trial activation (14 days) and expiry logic
- Dashboard usage meter UI
- **Downgrade enforcement** — When users downgrade (Pro/Max → Free), enforce new limits: read-only access to excess documents, block new uploads until under cap, show upgrade prompt
- **Account garbage collection** — Periodic cleanup for dormant accounts: archive Qdrant collections and S3 objects for users inactive 90+ days, delete after 180 days with prior email warning. Reclaim storage from cancelled/expired accounts exceeding Free limits after grace period.

