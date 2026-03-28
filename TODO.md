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

## Integrations

- **Define codebase-managed Integration Catalog + schema validation** — Add `src/lib/integrations/catalog.json` (or `catalog.ts`) as the source of truth for predefined integrations (still MCP underneath), validate entries with Zod on load, and include fields like `id`, `name`, `description`, `logo`, `docsUrl`, `serverUrl/template`, `authMode` (`oauth` | `token` | `api_key`), `category` (e.g. CRM, ERP, Project Management, Communication), `tags`, `featured`, `status`, plus marketing fields for `examplePrompts` and `sampleResponses`.
- **Keep catalog interface migration-ready** — Keep the catalog loader/repository interface stable so the source can move from codebase to DB/admin tooling later without rewriting the integrations UI.
- **MCP Client OAuth for external MCP clients** — Implement OAuth auth flow for the MCP endpoint per the [MCP auth spec](https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization) (`authorize`, `token`, `register`, PKCE, dynamic client registration) for clients like Cursor and Claude Desktop.
- **Implement integration connect flows by auth mode** — Support OAuth-based connects where available, plus token/API key flows, while storing all connections as MCP server configs.
- **Seed first predefined integrations** — Add an initial curated set (GitHub, Slack, Notion, Linear, Jira, Google Calendar) with accurate metadata and connection requirements.
- **Build `/dashboard/integrations` as the main integration hub** — New page with Featured integrations, searchable library, category + tag filters, and per-integration setup cards. When a user selects an integration, show example prompts + sample responses from catalog metadata. Page is visible to Free and Pro users.
- **Move MCP management from Settings to Integrations** — Migrate MCP UI entry points, keep Settings as a lightweight redirect/deep-link to the new page, and avoid duplicate management surfaces.
- **Gate integration actions to Pro with clear upgrade UX** — Keep integrations page/library visible to Free users, but gate connect/use actions behind Pro with contextual paywall messaging, upgrade CTAs, and trial-to-Pro conversion copy.
- **Add persistent upgrade CTA on `/dashboard/integrations` for Free users** — Add a prominent upgrade surface (header banner + inline integration card CTA states) so Free users always have a clear path to unlock connections.
- **Build reusable "Integration Cloud" section from catalog data** — Create a shared section component for both the main landing page and integrations feature page: featured logos, "questions you can answer", "things the agent can do", example prompts, and sample responses. Render from catalog metadata to avoid duplicate content maintenance.
- **Add "thousands more through MCP" messaging + CTA** — Include a clear extensibility message in the Integration Cloud section with CTA to browse/connect more MCP integrations.
- **Landing page rework for integrations-first conversion** — Rework hero and core sections to position Vernix as an in-call assistant that can answer live business questions using connected tools; add Pro-focused CTAs and upgrade banners.

## Task Management

- **Build `/dashboard/tasks` (cross-call task list)** — Add a dedicated page that lists tasks across all calls (similar information density to the Knowledge page).
- **Enable task completion from list view** — Add checkbox/toggle controls so users can mark tasks complete/incomplete directly from the task list.
- **Improve dashboard tasks widget navigation** — Show only top 3 pending tasks on the dashboard and link the widget to `/dashboard/tasks`.
- **Add "open related call" actions** — Include a direct link from each task to its source call detail page.
- **Add task source context** — Store and display the transcript snippet/timestamp that created each task, linking to the relevant transcript anchor.

## Empty States & Onboarding UX

- **Show dashboard-first navigation for logged-in users on public pages** — On landing and other public pages, replace Login/Sign up CTAs with a primary "Go to dashboard" action when a session exists.
- **Redirect authenticated users away from auth pages** — If a logged-in user visits `/login` or `/register`, immediately redirect them to `/dashboard`.
- **Users should be required to accept the terms of use and the privacy policy** — Add a checkbox to the signup form and the login form to accept the terms of use and the privacy policy.
- **SSO users should be required to accept the terms of use and the privacy policy** — Require them to accept the terms of use and the privacy policy after they sign up with SSO.
- **Dashboard calls empty state** — Add a primary "Start your first call" card when the user has no calls.
- **Knowledge page empty state** — Add a primary "Upload your first document" card when there are no knowledge files.
- **Integrations page empty state** — Add a primary "Connect your first integration" card when no integrations are configured.
- **Dashboard knowledge nudge** — Add a dashboard notice when no documents exist, with CTA copy focused on giving the agent business context.
- **Dashboard integrations nudge** — Add a dashboard notice when no integrations exist, with tool-use examples (CRM lookup, calendar checks, Slack follow-up actions).

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

- **Cron: Polar subscription reconciliation** — Run periodic `syncBillingFromPolar` for users with Polar customer IDs so plan/period state self-heals even if webhooks are delayed or missed.
- **Cron: billing meter retry/backfill** — Add scheduled retry/backfill for failed Polar metered usage ingests to prevent under/over-billing drift.
- **Cron: usage integrity audit** — Detect completed calls missing `usage_events` (or duplicate usage rows) and repair/report discrepancies.
- **Cron: inactive account cleanup policy** — Define inactivity windows + warning flow, then archive/deactivate/delete truly inactive accounts on schedule.
- **Cron: purge expired password reset tokens** — Delete expired rows from `password_reset_tokens` on a schedule instead of only cleaning during reset creation.
- **Cron: document processing watchdog** — Detect documents stuck in `processing` for too long; mark `failed` or retry parsing/embedding pipeline safely.
- **Cron: orphan DB record sweeper** — Periodically remove/repair records that lost parents (or should have cascaded) and reconcile mismatches between DB state and external artifacts.
- **Cron: orphaned storage cleanup** — Remove orphaned knowledge files in S3/Minio that no longer have a matching DB document row.
- **Cron: orphaned Qdrant collection cleanup** — Delete dangling `meeting_*` or stale per-user knowledge collections that no longer map to active DB records/retention policy.
- **Cron: dead-user data purge (S3 + Qdrant + Recall)** — For deleted/expired accounts, remove all remaining object storage files, user/meeting vector collections, and Recall call/bot artifacts to enforce retention and control storage costs.

## Billing Schema Cleanup

- **Add "trialing" plan enum value** — Currently trial state is derived from `plan === "free" && trialEndsAt > now && polarSubscriptionId`. Adding `plan: "trialing"` to the enum makes state explicit, removes derived logic in `isTrialActive`/`getEffectiveLimits`, and simplifies billing queries. Requires: schema migration (new enum value), update webhook handler to set `plan: "trialing"`, update all plan checks.

## Pricing Constants Sweep

- **Use billing constants everywhere** — `src/lib/billing/constants.ts` defines all prices, limits, and rates, but many files hardcode `€29`, `€30`, `200`, `€3/hr`, etc. Affected: pricing page, FAQ, upgrade-dialog trigger copy, trial-prompt-banner, feature pages, email templates, welcome page, SEO meta descriptions. Sweep all hardcoded values and replace with imports from constants. Email templates (HTML strings) need a helper function to inject values since they can't import TS directly.

## Product Terminology & Time Display

- **Rename "meetings" to "calls" in product UI copy** — Update user-facing labels for consistency while keeping internal API/schema naming unchanged unless explicitly migrated.
- **Call route naming consistency (`/dashboard/call/[id]`)** — Migrate call detail routing from `/dashboard/[id]` to `/dashboard/call/[id]`, add redirects/backward compatibility for old links, and update all internal navigation/deep links.
- **Add timezone preference + global formatting** — Introduce a user timezone setting (UTC/local/custom) and ensure all call timestamps honor it consistently.

## SEO & Discoverability

- ~~**robots.txt**~~ — Done. `public/robots.txt` allows all crawlers + AI bots, blocks `/dashboard` and `/api/`
- ~~**sitemap.xml**~~ — Done. `src/app/sitemap.ts` with all public pages including feature pages
- ~~**llms.txt**~~ — Done. `public/llms.txt` for AI search engines
- ~~**Meta tags audit**~~ — Done. All pages have unique SEO titles, descriptions, and OG tags optimized for click-through
- **Google Search Console** — Verify domain, submit sitemap, monitor indexing
- **Schema markup** — Add JSON-LD structured data: Organization, SoftwareApplication, FAQ schema on the FAQ page
- **Canonical URLs** — Ensure all pages have proper canonical tags via metadataBase
- **Dynamic robots.txt and sitemap** — Move `robots.txt` from static `public/` to a Next.js route handler (`src/app/robots.ts`) so it generates at build time from config. Same for `llms.txt`. Sitemap already generates dynamically. All should auto-include new pages without manual updates.
- **Search indexing kill switch** — Add `NEXT_PUBLIC_DISABLE_INDEXING=true` env var. When set, `robots.txt` returns `Disallow: /` for all bots and all pages get `<meta name="robots" content="noindex">`. For staging/preview environments.

## Public REST API & Documentation

- **API design** — Design a clean, versioned REST API (`/api/v1/`) exposing meetings, transcripts, tasks, search, knowledge base, and agent control (join/stop). Mirrors the existing internal routes but with stable contracts and proper error responses.
- **OpenAPI spec** — Write an OpenAPI 3.1 spec (`openapi.yaml`) documenting all endpoints, request/response schemas, auth (Bearer API key), pagination, and error codes.
- **API docs page** — Host interactive docs at `/docs` or `/api-docs` (Scalar, Swagger UI, or similar). Auto-generated from the OpenAPI spec.
- **Agent control endpoints** — `POST /api/v1/meetings` (create + auto-join), `POST /api/v1/meetings/:id/join` (join existing), `POST /api/v1/meetings/:id/stop` — lets external tools and agents invite Vernix to calls on the fly with just a meeting link.
- **MCP server tools** — Add `join_meeting` and `stop_meeting` tools to the MCP server so Claude Desktop / Cursor users can say "join this call" and paste a link.
- **Rate limiting & versioning** — Per-key rate limits, API version in URL path, deprecation headers.
- **SDKs** — Consider auto-generating TypeScript/Python SDKs from the OpenAPI spec.

## Claude Code Skill for Vernix

- **Vernix skill** — Create a Claude Code skill (`vernix`) that lets AI agents interact with Vernix via the REST API. Agents could list meetings, search transcripts, get summaries, create tasks, and ask questions about meeting content.
- **Skill packaging** — Publish as an installable skill with proper SKILL.md, tool definitions, and auth flow (API key from Vernix settings)
- **MCP + REST** — Skill uses the REST API under the hood; MCP server remains as an alternative for direct MCP clients (Claude Desktop, Cursor)
- **Use cases** — "What did we discuss in yesterday's standup?", "Find all action items assigned to me", "Search meetings for mentions of the Q4 roadmap"

## Security Hardening & Infra Go-Live Check

- **Set provider usage caps** — Add usage caps in OpenAI, Recall, and other third-party services.
- **Set Railway usage caps** — Add spend/usage caps and guardrails in Railway.
- **Configure alerting** — Configure alerts for cost, error rate, downtime, and abuse signals.
- **Configure Railway autoscaling** — Tune autoscaling limits and policies for safe production traffic handling.
- **Configure edge/network protection** — Set up firewalls and abuse blocking rules.
- **Run security scan & audit** — Run a security scan/audit with a tool like [Snyk](https://snyk.io/), then track/fix findings.
- **Block malicious bots** — Add bot blocking at app/edge level.
- **Internal blocklist controls** — Add internal admin tooling to quickly blocklist abusive IPs, emails, and user accounts.
- **Collect and attribute usage telemetry** — Track token usage, Recall usage, and related costs; attribute to users and flag abnormalities.
- **Block brute-force attempts** — Add brute-force protection on auth and other sensitive endpoints.
- **Enforce hard product usage caps** — Enforce hard caps for storage, embeddings, and meetings.
- **Restrict knowledge base uploads** — Enforce strict file type allowlist and size limits for uploaded knowledge base documents.
- **Validate and sanitize all user input** — Enforce max length limits and strict schema validation on all user-provided fields, and sanitize inputs before storage/use.

## Account Verification

- **Email verification flow** — Add verification tokens + email template + `/api/auth/verify-email` route and enforce verified email for credentials sign-ins before allowing full app access.
- **Optional profile enrichment fields in Settings** — Add optional `phone` and `company` fields to user profiles (DB + API + settings UI), without requiring them during signup.
- **Phone field UX + validation (non-blocking)** — Keep phone optional, validate/normalize format (E.164-style), and add a prebuilt country code dropdown input component in Settings.
- **Future-proof phone verification schema** — Add nullable `phoneVerifiedAt` now (without implementing phone OTP flow yet) to avoid later migration churn if verification is introduced.
- **Profile enrichment tests** — Add API/UI tests for optional `phone` and `company` updates, including validation edge cases and persistence checks.

## Email Communication & Conversion

Current emails: welcome (signup), free plan upgrade reminder (weekly cron), last chance retention (on cancel webhook), password reset.

- **Post-first-meeting email** — After a user's first meeting completes, email the summary link and nudge Pro trial. "Your first meeting summary is ready. With Pro, the agent pulls live data from your tools." Trigger from `processMeetingEnd` when meeting count = 1.
- **Trial started confirmation** — When Polar trial begins (subscription.created + trialing), confirm what they unlocked. "Your Pro trial is active. Connect your tools to get the most out of it." Include setup steps for integrations.
- **Mid-trial check-in (day 7)** — Cron job: find users 7 days into trial. "Halfway through your trial. Have you connected your tools yet?" with integration setup CTA.
- **Trial ending warning (day 11, 13)** — Cron job: find users whose trial ends in 3 or 1 days. "Your trial expires in X days. Here's what you'll lose." List features, show upgrade CTA. (Was implemented then removed, needs re-adding.)
- **Trial expired / downgraded email** — On subscription.revoked webhook, email what they lost. "Your Pro access has ended. You keep your meetings and transcripts. Upgrade anytime to restore voice agent and integrations."
- **Win-back email (30 days post-churn)** — Cron job: find users who churned 30 days ago. One final re-engagement. "A lot has changed since you left. Here's what's new." Only send once.
- **Email preference management** — Add unsubscribe links to all marketing/reminder emails. Respect opt-outs in a DB flag.
- **Email communication docs** — Maintain `docs/emails.md` documenting every email we send: trigger, timing, subject line, template function, and purpose. Keep this up to date as emails are added or changed.
- **Email template quality** — All templates should be clean, mobile-friendly HTML with consistent branding. Every email should have a clear single CTA, benefit-led copy, and convert toward the next step in the funnel. No generic copy. Review templates against conversion best practices before shipping.

## Blog & Content

- **Blog infrastructure** — Add a `/blog` section to the website. MDX or markdown-based posts with frontmatter (title, date, author, slug, description). Static generation via Next.js.
- **Blog list page** — `/blog` showing all posts sorted by date with title, excerpt, and read time
- **Blog post page** — `/blog/[slug]` rendering full post with proper typography, OG images, and author info
- **Initial posts** — Write 3-5 launch posts:
  - "Introducing Vernix — an AI agent for your video calls"
  - "How Vernix transcribes and searches across all your meetings"
  - "Voice agent vs. silent mode: when to use each"
  - "Building Vernix: from hackathon idea to production"
  - "Why we built MCP integration into a meeting tool"

## Google Analytics Sales Funnel

- **Funnel events** — Define and instrument key conversion events: landing page → signup → first meeting → upgrade
- **Goal configuration** — Set up GA4 conversions for signup, first meeting created, plan upgrade
- **Attribution** — UTM parameter tracking across signup flow for campaign attribution
- **Feature usage event tracking** — Track key in-product feature usage events (chat queries, voice agent usage, silent mode, knowledge uploads, exports, task completion, API key usage) for product analytics beyond funnel conversion.
- **Event taxonomy & dashboards** — Define a consistent event naming schema/properties and build dashboards for activation, retention, and feature adoption trends.

## A/B Testing for Landing Pages

- **Experiment setup** — Add A/B testing framework for landing page variants (headline, hero CTA, social proof blocks, pricing teaser).
- **Variant assignment** — Implement deterministic user/session bucketing and persist variant assignment.
- **Experiment analytics** — Track impressions, CTA clicks, signup starts, and completed signups per variant.
- **Decision workflow** — Define experiment guardrails (minimum sample size, runtime, significance target) and rollout/rollback process.

## Marketing Visual Assets & Product Demo Content

- **Animated demo video** — Create a polished animated product demo (Clueso-style and/or Remotion-based) for landing page hero and social snippets.
- **Narrated product demo** — Record a full product walkthrough with voice narration (Loom-style) covering setup, joining a meeting, transcript/RAG, and action items.
- **Tutorial video series** — Produce short task-focused tutorial videos (1-3 min each) for key workflows and FAQs.
- **Screenshot library** — Capture and curate high-quality screenshots for landing, pricing, docs/help, social previews, and press kit usage.
- **Visual asset pack** — Create supporting branded assets (feature illustrations, icons, UI callout graphics, thumbnails, GIF loops).
- **Site integration pass** — Integrate videos and assets across landing/pricing/content sections with optimized formats, lazy loading, and mobile-safe fallbacks.

## Vision-Based Document Parsing

- **OpenAI Vision for PDFs** — Current PDF parsing (pdfjs-dist) extracts raw text only — images, charts, tables, and scanned pages are invisible. Use GPT-4o vision to process PDF pages as images for richer extraction
- **Image/diagram uploads** — Accept PNG, JPG, SVG uploads in knowledge base, extract descriptions via vision API
- **Hybrid parsing** — Try text extraction first; if a page has low text density, fall back to vision-based extraction
- **Cost management** — Vision API is expensive per page; add per-user limits or make it a premium feature

## Changelog & Status Page

- **CHANGELOG.md** — Create and maintain a changelog file in the repo tracking all releases and notable changes
- **Public changelog page** — `/changelog` page on the website rendering the changelog with dates, version tags, and descriptions
- **Service uptime monitoring** — Monitor all critical dependencies: Vernix app, Recall.ai, OpenAI API, Polar, Railway, Qdrant, S3/Minio. Alert on downtime.
- **Public status page** — Host a public status page (e.g. Openstatus, Instatus, or BetterStack) showing real-time uptime for all services. Link from footer.

## 2FA Support

- **2FA support (optional)** — Add opt-in app-level 2FA (TOTP authenticator app first; SMS only if required), backup codes, recovery UX, and step-up auth for sensitive actions.

## Account removal by admins

- **Admin account data purge (full hard delete)** — Add an admin operation to fully remove all data for a user account across DB records, object storage bucket data, vector stores, and Recall resources (calls/bots/recordings/transcripts).
- **Define deletion contract + safeguards** — Document exactly what "hard delete" removes, require explicit admin confirmation (`type email + userId`), and add audit logs for who initiated deletion and when.
- **Build dry-run mode** — Before execution, show a deletion preview (row counts, storage objects, vector collections, Recall assets) so admins can validate blast radius.
- **Implement orchestrated purge job** — Create a background workflow that deletes in deterministic order (API keys/sessions -> meetings/tasks/docs -> storage -> vectors -> Recall artifacts -> user row).
- **Idempotency + retries** — Make purge re-runnable with step checkpoints, retries, and compensating behavior so partial failures can recover safely.
- **Provider cleanup adapters** — Add explicit cleanup modules for S3/Minio, Qdrant, and Recall with robust error reporting and rate-limit handling.
- **Post-delete verification** — Run a final integrity check that confirms no remaining user-linked DB records, storage keys, or vector collections.
- **Admin UX + status tracking** — Add admin UI/API for "queued/running/failed/completed" states with failure reasons and retry action.
- **Tests + docs** — Add integration tests for full purge and partial-failure recovery; document operational runbook and expected timings.

## Scoped context, tools and data access

- **Data access scoping via Groups/Tags/Buckets/Topics (naming TBD)** — Add a grouping model for knowledge documents, calls, and MCP tool connections, then scope agent access by selected group(s) per call (e.g. call in `outbound` can only access `outbound` data/connections). Support multi-select groups. `No group` / `all` should preserve current full-access behavior. Primary goal is preventing context leakage and accidental private-data exposure. Mention this on the landing page and likely ship a dedicated feature page since leakage prevention is a major user concern.
- **Naming + product language decision** — Decide final term (`Groups`, `Tags`, `Buckets`, `Topics`) based on clarity, security connotation, and future extensibility.
- **Data model + migration** — Add group entities and many-to-many mappings for knowledge docs, calls, and MCP server connections; include ownership constraints and indexes.
- **Default behavior policy** — Define exact semantics for `No group` / `All access` and avoid accidental overexposure when new resources are created.
- **Call-level access resolver** — Build shared resolver logic that computes allowed resources for a call from selected group set (including multi-select union behavior).
- **Enforce in every retrieval path** — Apply scope filters to RAG context fetch, transcript/document search, MCP tool invocation, and any agent-side context APIs.
- **Creation/edit UI flows** — Add group assignment controls on knowledge upload, call setup/edit, and integration connection settings, including multi-select UX.
- **Backfill + rollout plan** — Migrate existing data safely (e.g. ungrouped -> `All access`), with staged rollout and feature flag for incremental adoption.
- **Guardrail tests** — Add negative tests proving cross-group leakage is blocked (especially for public agent endpoints and tool calls).
- **Observability + auditability** — Log scope decisions (`why resource was allowed/blocked`) for debugging trust and compliance reviews.
- **Marketing surface area** — Add landing page messaging and a dedicated feature page focused on "context leakage prevention" with concrete enterprise/security examples.
