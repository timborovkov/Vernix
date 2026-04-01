# TODO

## Public REST API & Documentation

- **API design** — Design a clean, versioned REST API (`/api/v1/`) exposing meetings, transcripts, tasks, search, knowledge base, and agent control (join/stop).
- **OpenAPI spec** — Write an OpenAPI 3.1 spec documenting all endpoints, request/response schemas, auth, pagination, and error codes.
- **API docs page** — Host interactive docs at `/docs` or `/api-docs`.
- **Agent control endpoints** — `POST /api/v1/meetings` (create + auto-join), `POST /api/v1/meetings/:id/join`, `POST /api/v1/meetings/:id/stop`.
- **MCP server tools** — Add `vernix_join_call` (create and instantly join a call), `vernix_stop_call` (stop the call), `vernix_search_meetings` (search across meeting transcripts and knowledge base using vector similarity), `vernix_search_tasks` (search across tasks using vector similarity), and other tools as needed.
- **Rate limiting & versioning** — Per-key rate limits, API version in URL path, deprecation headers.
- **API in llms.txt** — Link to the API docs in the llms.txt file and add an introduction to the API.

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
- **Hotjar tracking** — Add Hotjar tracking to the website for heatmaps and session recording. Remember to update the privacy and cookie policies to include Hotjar. Make sure cookie consent is working correctly.

## Security Hardening & Infra Go-Live Check

- **Set provider usage caps** — Add usage caps in OpenAI, Recall, and other third-party services.
- **Set Railway usage caps** — Add spend/usage caps and guardrails in Railway.
- **Configure alerting** — Configure alerts for cost, error rate, downtime, and abuse signals.
- **Run security scan & audit** — Run a security scan/audit, then track/fix findings.
- **Block malicious bots** — Add bot blocking at app/edge level.
- **Collect and attribute usage telemetry** — Track token usage, Recall usage, and related costs.
- **Configure LLM tracing** — Configure something like Langsmith tracing for all AI agents and tools. (note, we use OpenAI, so Langsmith is probably not the best choice)

## Account Verification

- **Email verification flow** — Add verification tokens + email template + verify route, enforce verified email before full app access.
- **Optional profile enrichment fields in Settings** — Add optional `phone` and `company` fields to user profiles.

## Scoped Context, Tools and Data Access

- **Data access scoping via Groups/Tags** — Add a grouping model for knowledge documents, calls, and MCP tool connections, then scope agent access by selected group(s) per call. Primary goal is preventing context leakage.
- **Multiple connections to the same tool** — Allow multiple MCP integration connections to the same tool. The user might a member of multiple teams, projects, and organizations, and each might have a Notion or Linear workspace.
- **List tools in the UI** — List available tools from MCP integrations in the UI, so the user can see what they can connect to.
- **Allow toggling tools on/off** — Allow the user to toggle tools provided by MCP integrations on/off in the UI, so they can control which tools are available to the agent.

## Inactive Account Cleanup

- **Cron: dead-user data purge (S3 + Qdrant + Recall)** — For deleted/expired accounts, remove all remaining object storage files, user/meeting vector collections, and Recall call/bot artifacts to enforce retention and control storage costs. Requires user deletion flow first.
- **Inactive account cleanup: warning emails + archival** — Current inactive-cleanup cron only detects; needs warning email flow and actual archival/deletion logic.

## Vision-Based Document Parsing

- **OpenAI Vision for PDFs** — Use GPT-4o vision to process PDF pages as images for richer extraction.
- **Image/diagram uploads** — Accept PNG, JPG, SVG uploads in knowledge base, extract descriptions via vision API.

## Changelog & Status Page

- **CHANGELOG.md** — Create and maintain a changelog file
- **Public changelog page** — `/changelog` page on the website
- **Service uptime monitoring** — Monitor all critical dependencies
- **Public status page** — Host a public status page showing real-time uptime
