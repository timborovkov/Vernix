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

## Integrations

- **Landing page rework for Integrations-first positioning** - Rework hero and conversion sections to position Vernix as your in-call assistant that joins meetings and answers live business questions from integrated systems (e.g. "what were sales yesterday?", "which location performed best this quarter?"). Add clear Pro-focused CTAs, integration proof blocks, and upgrade banners throughout the page.
- **Add a new Integrations page** - Basically we would only support MCPs, like we already do, but we could predefine a list of MCPs that users can choose from to quickly connect to, with logos, descriptions, and links to the MCP server documentation.
- **Move MCPs from Settings to separate Integrations page**
- **MCP Client OAuth** - Implement OAuth-based authentication for the MCP server endpoint per the [MCP auth spec](https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization). Allow tools like Claude Desktop and Cursor to authenticate via OAuth flow instead of manually copying API keys. Requires authorization server endpoints (authorize, token, register), PKCE support, and dynamic client registration.
- **Integration Library** - Quickly connect to predefined MCP servers like Linear, Calendar, Notion, Jira, Github, Slack, etc.
- **Pro users only** - Only Pro users should be able to connect to MCP servers. This is our key selling point, so we should make sure we have proper CTA and messaging around it.

## Task list page

- **Task list page** - Add a new Task list page to the dashboard that shows all tasks for all meetings. Similar to the knowledge page, but for tasks.
- **Update pending task view on the dashboard** - Link to the task list page from the dashboard tasks widget. Limit amount of tasks shown on the dashboard to 3.
- **Allow marking tasks as completed** - Add a checkbox to the task list page to mark tasks as completed.
- **Link to meeting from task list page** - Link to the meeting from the task list page.
- **Track why a task was created** - Remember what was said in the meeting that created the task, and show it in the task list page, linking to the relevant transcript segment.

## Empty states for user experience

- **Dashboard calls empty state** - The dashboard should show a big notice thing to start a first meeting when there are no meetings yet. Like a "hop on your first call" card.
- **Knowledge page empty state** - The knowledge page should show a big notice thing to upload your first document when there are no documents yet. Like a "upload your first document" card.
- **Notice on the dashboard when there are no documents in the knowledge base** - Show a big notice thing to upload your first document when there are no documents yet. Like a "upload your first document for agent to have context" card.
- **Notice on the integrations page when there are no integrations** - Show a big notice thing to connect your first integration when there are no integrations yet. Like a "connect your first integration" card.
- **Notice on the dashboard when there are no integrations connected** - Show a big notice thing to connect your first integration when there are no integrations yet. Like "connect your first integration to start using Vernix" card. Point out that the agent would be able to then use "tools during the call", like "get the latest sales data from your CRM", "check the calendar for your next meeting", "send a Slack message to the #important-project channel with the summary of the call", etc.

## Off topic tasks

- **Rename "meetings" to "calls" everywhere in the app** - "calls" is more accurate and less specific than "meetings".
- **Rework single call page** - The single call page can get way too long - too much to scroll. Let's split it in to tabs, each tab could be a separate page, like "transcript", "knowledge", "tasks", "summary", "recording", "participants", "summary", "recording", "participants", "summary", "recording", "participants".
- **Single call pages and anchor links** - Certain parts of the single call page tabs could be anchor links, like "call/12345#recording", while some could be regular pages, like "call/12345/transcript".
- **Call transcripts should scroll** - The transcript should have a max height with a scroll bar, so the user can scroll through the transcript, instead of scrolling the whole page.
- **Call page agent chat should be more prevelant** - The agent chat should be more prevelant on the call page, like a sidebar. Essentially all the call information should be available in the chat. If something, like an audio recording, is not renderable in chat, the chat could give a full clickable anchor link to the thing, like "call/12345/transcript#audio-recording".
- **Call link on the call page** - The call page should have a link to the call. Meeting cards on the dashboard currently have those.
- **Call meeting link styling** - The call meeting link should be styled as a button, with an icon, and open in a new tab.
- **Call export should include all the call data** - The call export should include all the call data, like the transcript, knowledge base, tasks, and recording. Stuff like media (e.g. audio recordings or whatever) should be exportable as separate files, and in PDFs or MD files be available as links to the app, like https://vernix.app/api/meetings/[id]/transcript#recording, where they could then be downloaded and shared.
- **Clearer timezone management** - I'm not sure which timezone are transcripts, meeting times, etc. in the app. It should be clearer. Maybe we should specify in settings what we use by default, but allow the user to pick their own setting, eg. "use UTC", "use my local timezone", "pick a timezone from a list of timezones". After this all times in the app would follow the timezone setting.
- **Calls miss summaries** - Calls currently sometimes miss summaries. This can be due to many things, but essentially when a user navigates to the call page and a summary etc. are missing, we could re-run all the post call jobs, like the summary generation, the task extraction, the knowledge base processing, etc, so the user could always have access to the latest information, with no missing bits.

## SEO & Discoverability

- **robots.txt** — Add `public/robots.txt` allowing all crawlers, pointing to sitemap
- **sitemap.xml** — Generate `src/app/sitemap.ts` listing all public pages (landing, pricing, faq, about, contact, terms, privacy)
- **llms.txt** — Add `public/llms.txt` describing Vernix for AI search engines (ChatGPT, Perplexity, Gemini, Claude)
- **Google Search Console** — Verify domain, submit sitemap, monitor indexing
- **Schema markup** — Add JSON-LD structured data: Organization, SoftwareApplication, FAQ schema on the FAQ page
- **Meta tags audit** — Verify all pages have unique title, description, and OG images
- **Canonical URLs** — Ensure all pages have proper canonical tags via metadataBase

## Meeting Recordings & Recall Data Sync

- **Audit Recall data** — Investigate what data Recall provides after a meeting: video recording (MP4), participant events, meeting metadata, speaker timeline. Map what's available via their API.
- **Webhook fallback fetch** — Implement a reliability fallback that actively fetches meeting/recording/transcript status from Recall when expected webhooks are delayed or missing (scheduled retries + reconciliation job).
- **Copy recordings to our storage** — After `recording_done`, download the video MP4 from Recall's S3 URL (expires after 6h) and upload to our S3/Minio bucket. Store the S3 key in meeting metadata.
- **Participant data** — Fetch participant events and speaker timeline from Recall, store in meeting metadata (currently only populated from transcript speaker names).
- **Video playback UI** — Add a video player to the meeting detail page. Sync transcript timeline with video position (click a transcript line → seek to that timestamp).
- **Recording retention** — Decide on storage policy: keep forever, expire after N days, or let user choose. Estimate storage costs per meeting minute.
- **Privacy controls** — Let users disable recording storage per meeting. Delete recording when meeting is deleted. Clear deletion from S3 bucket.

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
- **Admin account data purge** — Add an admin operation to fully remove all data for a user account across DB records, object storage bucket data, and Recall resources.

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
