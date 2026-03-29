# TODO

## Completed

- Core Pipeline (functional baseline)
- Voice Agent (differentiator)
- Post-Meeting Processing
- UX Polish
- Authentication
- Live Voice Agent
- Chat with Meeting Notes
- Knowledge Base (file uploads + RAG)
- Meeting-Scoped Knowledge
- Meeting Context & Agenda
- Action Items & Tasks
- MCP Tool Connections
- Data Export
- Production Hardening
- Rebrand to Vernix (`vernix.app`)
- UI Polish & Launch Prep
- Dark Mode & Theme Selector
- User Profiles & SSO
- Password Reset & NextAuth Email Integration
- Silent Agent Mode (Text Agent)
- Switch to TanStack Query
- MCP Server Connection Testing
- Analytics & Monitoring
- Contact Forms & Email
- Welcome Email
- Pricing strategy calculation
- Pricing page (`/pricing`)
- Self-kick agent tool (leave_meeting)
- Switch to silent mode tool (switch_to_silent)
- User mute control (UI kill switch)
- Mute state enforcement
- Hide completed tasks from dashboard action points
- Show meeting-scoped files on knowledge page
- Voice Mode Rewrite (On-Demand Realtime)
- Internal Agent System Documentation (`docs/agent-architecture.md`)
- Fast Wake-Word Detection (Client-Side VAD + gpt-4o-mini-transcribe)
- Billing with Polar (constants, Polar integration, hard caps, usage tracking, billing UI, webhook handler, limit enforcement, paywalls)
- Billing lifecycle emails (disable trial-expiry reminders, weekly free-user upgrade reminders, cancellation retention emails)
- Cron job upgrade reminders for free users every week, email them to let them know about the upgrade options.
- Subscription cancellation access policy (keep access until period/trial end)
- Cron documentation sync (`docs/cron-jobs.md` aligned with active jobs)
- Integrations platform foundation: Zod-validated catalog (`src/lib/integrations/catalog.ts`), 30 seeded integrations, custom MCP auth types (none/bearer/header/basic/OAuth), OAuth flow (MCP SDK authProvider + state JWT + PKCE + token storage), and pre-registered GitHub OAuth
- Integrations UX revamp: `/dashboard/integrations` searchable catalog + category filters + connected server cards, Integration Cloud on landing/feature pages, MCP management moved from Settings, and Pro/Trial paywall gating
- Reliability hardening: Recall webhook signature verification (Svix) and meeting-usage billing idempotency guard
- Growth and discoverability surfaces: Welcome to Pro page (`/welcome-to-pro`), feature landing pages (`/features/integrations`, `/features/meeting-memory`, `/features/context`), and SEO foundations (robots.txt, sitemap.xml, llms.txt, meta tags)
- Billing operations and packaging: Polar subscription reconciliation cron (`/api/cron/billing-sync`) and trial policy aligned to full Pro feature access (voice, API, MCP, integrations)
- Task management: `/dashboard/tasks` cross-call task list with filter tabs (open/all/completed), inline task completion with optimistic updates, dashboard widget limited to 3 tasks with "View all" link, Tasks nav button in header, meeting title links to source call, task source context (transcript snippet + timestamp from extraction)
- Empty states and onboarding UX: auth page redirects for logged-in users (middleware), public site header shows "Dashboard" when authenticated, landing page auth-aware CTAs, dashboard "Start your first call" empty state with knowledge/integrations nudges, integrations page first-connection banner
- Terms of use acceptance: checkbox on credentials signup form, SSO post-auth acceptance page (`/accept-terms`), middleware enforcement (`termsAcceptedAt` in JWT), schema column on users table

## Integrations

- **Register OAuth apps for more services** — Currently only GitHub has a pre-registered OAuth app. To enable more OAuth integrations (Slack, Linear, Notion, etc.): register Vernix on each service's developer console, add env vars, add to `PRE_REGISTERED_CLIENTS` in `oauth-provider.ts`, change catalog status to `available`.


## Call Detail Page UX

- **Restructure call detail into tabs/routes** — Split the long call page into focused sections (transcript, knowledge, tasks, summary, recording, participants).
- **Define deep-link strategy for call pages** — Use route segments for major sections (e.g. `/call/:id/transcript`) and anchors for intra-section jumps (e.g. `#recording`).
- **Improve transcript readability** — Add a bounded transcript panel with internal scroll to reduce full-page scroll fatigue.
- **Promote agent chat on call page** — Make chat a more prominent panel/sidebar and provide contextual deep links for non-renderable assets (e.g. recordings).
- **Improve call link UX** — Add a dedicated call link action on call detail, styled as a button with icon and opening in a new tab.

## Call Reliability, Recording Sync & Recovery

- **Recall data audit** — Investigate what Recall provides after a call: recording MP4, participant events, meeting metadata, and speaker timeline. Map available API fields and lifecycle timing.
- **Recall webhook fallback + reconciliation cron** — Add reliability fallback that actively fetches meeting/recording/transcript status when webhooks are delayed or missing, and re-drives stuck artifact processing.
- **On-demand Recall refresh on call open** — When a user opens call detail, if artifacts are missing/stale, trigger a bounded Recall fetch/reconciliation and refresh the page state so late data appears without waiting for cron.
- **Recover stale `active` / `processing` calls** — In the reconciliation flow, detect calls stuck in `active` or `processing` and safely re-run status progression + artifact generation.
- **Recover stale `joining` calls** — Mark calls stuck in `joining` beyond a safe timeout as `failed` so they do not block concurrency limits.
- **Copy recordings to our storage** — After `recording_done`, download Recall's expiring S3 MP4 URL (6h) and upload to our S3/Minio bucket, storing the persisted key in meeting metadata.
- **Persist participant/speaker data** — Fetch participant events and speaker timeline from Recall and store them in meeting metadata (currently inferred only from transcript speaker names).
- **Video playback UI** — Add a meeting detail video player and sync transcript timeline with playback (click transcript line -> seek to timestamp).
- **Recording retention policy** — Decide keep/expire/user-configurable retention rules and estimate storage cost per meeting minute.
- **Recording privacy controls** — Let users disable recording storage per call, and ensure meeting deletion also deletes stored media from S3/Minio.
- **Expand export completeness** — Include transcript, knowledge, tasks, participant metadata, and recording references in exports; ship media as separate files where applicable.
- **Missing-artifact recovery from call view** — Detect missing post-call artifacts and provide re-run actions for summary/task/knowledge generation.

## Cron Jobs & Background Reconciliation

- **Cron: billing meter retry/backfill** — Add scheduled retry/backfill for failed Polar metered usage ingests to prevent under/over-billing drift.
- **Cron: usage integrity audit** — Detect completed calls missing `usage_events` (or duplicate usage rows) and repair/report discrepancies.
- **Cron: inactive account cleanup policy** — Define inactivity windows + warning flow, then archive/deactivate/delete truly inactive accounts on schedule.
- **Cron: purge expired password reset tokens** — Delete expired rows from `password_reset_tokens` on a schedule instead of only cleaning during reset creation.
- **Cron: document processing watchdog** — Detect documents stuck in `processing` for too long; mark `failed` or retry parsing/embedding pipeline safely.
- **Cron: orphan DB record sweeper** — Periodically remove/repair records that lost parents (or should have cascaded) and reconcile mismatches between DB state and external artifacts.
- **Cron: orphaned storage cleanup** — Remove orphaned knowledge files in S3/Minio that no longer have a matching DB document row.
- **Cron: orphaned Qdrant collection cleanup** — Delete dangling `meeting_*` or stale per-user knowledge collections that no longer map to active DB records/retention policy.
- **Cron: dead-user data purge (S3 + Qdrant + Recall)** — For deleted/expired accounts, remove all remaining object storage files, user/meeting vector collections, and Recall call/bot artifacts to enforce retention and control storage costs.

## Pricing Constants Sweep

- **Use billing constants everywhere** — `src/lib/billing/constants.ts` defines all prices, limits, and rates, but many files hardcode `€29`, `€30`, `200`, `€3/hr`, etc. Affected: pricing page, FAQ, upgrade-dialog trigger copy, trial-prompt-banner, feature pages, email templates, welcome page, SEO meta descriptions. Sweep all hardcoded values and replace with imports from constants. Email templates (HTML strings) need a helper function to inject values since they can't import TS directly.

## Product Terminology & Time Display

- **Rename "meetings" to "calls" in product UI copy** — Update user-facing labels for consistency while keeping internal API/schema naming unchanged unless explicitly migrated.
- **Call route naming consistency (`/dashboard/call/[id]`)** — Migrate call detail routing from `/dashboard/[id]` to `/dashboard/call/[id]`, add redirects/backward compatibility for old links, and update all internal navigation/deep links.
- **Add timezone preference + global formatting** — Introduce a user timezone setting (UTC/local/custom) and ensure all call timestamps honor it consistently.

## SEO & Discoverability

- **Google Search Console** — Verify domain, submit sitemap, monitor indexing
- **Schema markup** — Add JSON-LD structured data: Organization, SoftwareApplication, FAQ schema on the FAQ page
- **Canonical URLs** — Ensure all pages have proper canonical tags via metadataBase
- **Dynamic robots.txt and sitemap** — Move `robots.txt` from static `public/` to a Next.js route handler so it generates at build time from config. Same for `llms.txt`.
- **Search indexing kill switch** — Add `NEXT_PUBLIC_DISABLE_INDEXING=true` env var for staging/preview environments.

## Public REST API & Documentation

- **API design** — Design a clean, versioned REST API (`/api/v1/`) exposing meetings, transcripts, tasks, search, knowledge base, and agent control (join/stop).
- **OpenAPI spec** — Write an OpenAPI 3.1 spec documenting all endpoints, request/response schemas, auth, pagination, and error codes.
- **API docs page** — Host interactive docs at `/docs` or `/api-docs`.
- **Agent control endpoints** — `POST /api/v1/meetings` (create + auto-join), `POST /api/v1/meetings/:id/join`, `POST /api/v1/meetings/:id/stop`.
- **MCP server tools** — Add `join_meeting` and `stop_meeting` tools to the MCP server.
- **Rate limiting & versioning** — Per-key rate limits, API version in URL path, deprecation headers.

## Email Communication & Conversion

Current emails: welcome (signup), free plan upgrade reminder (weekly cron), last chance retention (on cancel webhook), password reset.

- **Post-first-meeting email** — After a user's first meeting completes, email the summary link and nudge Pro trial.
- **Trial started confirmation** — When Polar trial begins, confirm what they unlocked with setup steps for integrations.
- **Mid-trial check-in (day 7)** — Cron job: find users 7 days into trial. "Have you connected your tools yet?"
- **Trial ending warning (day 11, 13)** — Cron job: find users whose trial ends in 3 or 1 days.
- **Trial expired / downgraded email** — On subscription.revoked webhook, email what they lost.
- **Win-back email (30 days post-churn)** — Cron job: find users who churned 30 days ago. One final re-engagement.
- **Email preference management** — Add unsubscribe links to all marketing/reminder emails.
- **Email communication docs** — Maintain `docs/emails.md` documenting every email we send.

## Blog & Content

- **Blog infrastructure** — Add a `/blog` section with MDX/markdown posts, frontmatter, static generation.
- **Initial posts** — Write 3-5 launch posts.

## Google Analytics Sales Funnel

- **Funnel events** — Define and instrument key conversion events: landing page → signup → first meeting → upgrade
- **Goal configuration** — Set up GA4 conversions for signup, first meeting created, plan upgrade
- **Attribution** — UTM parameter tracking across signup flow for campaign attribution
- **Feature usage event tracking** — Track key in-product feature usage events for product analytics.

## Security Hardening & Infra Go-Live Check

- **Set provider usage caps** — Add usage caps in OpenAI, Recall, and other third-party services.
- **Set Railway usage caps** — Add spend/usage caps and guardrails in Railway.
- **Configure alerting** — Configure alerts for cost, error rate, downtime, and abuse signals.
- **Run security scan & audit** — Run a security scan/audit, then track/fix findings.
- **Block malicious bots** — Add bot blocking at app/edge level.
- **Collect and attribute usage telemetry** — Track token usage, Recall usage, and related costs.

## Account Verification

- **Email verification flow** — Add verification tokens + email template + verify route, enforce verified email before full app access.
- **Optional profile enrichment fields in Settings** — Add optional `phone` and `company` fields to user profiles.

## Vision-Based Document Parsing

- **OpenAI Vision for PDFs** — Use GPT-4o vision to process PDF pages as images for richer extraction.
- **Image/diagram uploads** — Accept PNG, JPG, SVG uploads in knowledge base, extract descriptions via vision API.

## Changelog & Status Page

- **CHANGELOG.md** — Create and maintain a changelog file
- **Public changelog page** — `/changelog` page on the website
- **Service uptime monitoring** — Monitor all critical dependencies
- **Public status page** — Host a public status page showing real-time uptime

## Scoped Context, Tools and Data Access

- **Data access scoping via Groups/Tags** — Add a grouping model for knowledge documents, calls, and MCP tool connections, then scope agent access by selected group(s) per call. Primary goal is preventing context leakage.
