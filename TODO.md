# TODO

## Integrations

- **Register OAuth apps for more services** — Currently only GitHub has a pre-registered OAuth app. To enable more OAuth integrations (Slack, Linear, Notion, etc.): register Vernix on each service's developer console, add env vars, add to `PRE_REGISTERED_CLIENTS` in `oauth-provider.ts`, change catalog status to `available`.

## Cron Jobs & Background Reconciliation

- **Cron: dead-user data purge (S3 + Qdrant + Recall)** — For deleted/expired accounts, remove all remaining object storage files, user/meeting vector collections, and Recall call/bot artifacts to enforce retention and control storage costs. Requires user deletion flow first.
- **Inactive account cleanup: warning emails + archival** — Current inactive-cleanup cron only detects; needs warning email flow and actual archival/deletion logic.

## Blog & Content

- **Blog infrastructure** — Add a `/blog` section with MDX/markdown posts, frontmatter, static generation.
- **Initial posts** — Write 3-5 launch posts.

## SEO & Discoverability

- **Google Search Console** — Verify domain, submit sitemap, monitor indexing - DONE
- **Schema markup** — Add JSON-LD structured data: Organization, SoftwareApplication, FAQ schema on the FAQ page
- **Canonical URLs** — Ensure all pages have proper canonical tags via metadataBase
- **Dynamic robots.txt and sitemap** — Move `robots.txt` from static `public/` to a Next.js route handler so it generates at build time from config. Same for `llms.txt` and `sitemap.xml`.
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
- **Email template design/brand QA pass** — Audit all existing email templates (welcome, upgrade reminders, retention, password reset, and new lifecycle emails) for visual consistency and quality: correct logo usage, colors, typography, spacing, CTA styling, dark-mode behavior where applicable, and cross-client rendering.
- **Email communication docs** — Maintain `docs/emails.md` documenting every email we send.

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
