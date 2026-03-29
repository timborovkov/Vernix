import { z } from "zod/v4";

// ---------------------------------------------------------------------------
// Integration catalog schema
// ---------------------------------------------------------------------------

const categoryEnum = z.enum([
  "communication",
  "project-management",
  "dev-tools",
  "crm",
  "productivity",
  "other",
]);

const authModeEnum = z.enum(["api_key", "token", "oauth", "none", "url_key"]);

const integrationSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  logo: z.string(),
  category: categoryEnum,
  tags: z.array(z.string()),
  featured: z.boolean(),
  status: z.enum(["available", "coming-soon"]),

  // Connection
  serverUrl: z.string().nullable(),
  authMode: authModeEnum,
  authKeyParam: z.string().optional(), // for url_key: the query param name (e.g. "exaApiKey")
  docsUrl: z.string(),
  setupInstructions: z.string(),

  // Marketing
  examplePrompts: z.array(z.string()),
  sampleResponses: z.array(z.string()),
});

export type Integration = z.infer<typeof integrationSchema>;
export type IntegrationCategory = z.infer<typeof categoryEnum>;

// ---------------------------------------------------------------------------
// Catalog data
// ---------------------------------------------------------------------------

const CATALOG: Integration[] = [
  // ── Available (connectable now) ──────────────────────────────────────
  {
    id: "github",
    name: "GitHub",
    description: "Check PRs, review commits, and look up repository activity.",
    logo: "/integrations/github.svg",
    category: "dev-tools",
    tags: ["code", "pull-requests", "repositories"],
    featured: true,
    status: "available",
    serverUrl: "https://api.githubcopilot.com/mcp/",
    authMode: "oauth",
    docsUrl:
      "https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp/set-up-the-github-mcp-server",
    setupInstructions:
      "Click Connect to authorize Vernix with your GitHub account.",
    examplePrompts: [
      "What changed in the last deploy?",
      "Show me open PRs on the main repo",
    ],
    sampleResponses: [
      "The last deploy included 3 PRs: auth fix, billing update, and UI polish.",
    ],
  },
  {
    id: "airtable",
    name: "Airtable",
    description: "Query bases, tables, and records.",
    logo: "/integrations/airtable.svg",
    category: "productivity",
    tags: ["databases", "spreadsheets", "records"],
    featured: true,
    status: "available",
    serverUrl: "https://mcp.airtable.com/mcp",
    authMode: "token",
    docsUrl: "https://support.airtable.com/docs/using-the-airtable-mcp-server",
    setupInstructions:
      "Enter your Airtable Personal Access Token. Create one at airtable.com/create/tokens with Data.records and schema.bases scopes.",
    examplePrompts: ["How many leads did we add this week?"],
    sampleResponses: ["12 new leads added, 4 from the webinar campaign."],
  },
  {
    id: "firecrawl",
    name: "Firecrawl",
    description: "Scrape and extract content from any website.",
    logo: "/integrations/firecrawl.svg",
    category: "dev-tools",
    tags: ["scraping", "web", "extraction"],
    featured: true,
    status: "available",
    serverUrl: "https://mcp.firecrawl.dev/v2/mcp",
    authMode: "token",
    docsUrl: "https://docs.firecrawl.dev/mcp-server",
    setupInstructions:
      "Enter your Firecrawl API key from firecrawl.dev/app/api-keys.",
    examplePrompts: ["Scrape the homepage of our competitor"],
    sampleResponses: [
      "Found 3 key sections: pricing at $49/mo, 2 new features, and a case study.",
    ],
  },
  {
    id: "exa",
    name: "Exa",
    description: "AI-powered web search with real-time results.",
    logo: "/integrations/exa.svg",
    category: "productivity",
    tags: ["search", "ai", "web"],
    featured: true,
    status: "available",
    serverUrl: "https://mcp.exa.ai/mcp",
    authMode: "url_key",
    authKeyParam: "exaApiKey",
    docsUrl: "https://exa.ai/docs/reference/exa-mcp",
    setupInstructions: "Enter your Exa API key from dashboard.exa.ai/api-keys.",
    examplePrompts: ["Find recent articles about our competitor"],
    sampleResponses: [
      "Found 5 articles from the last week discussing their Series B and new product launch.",
    ],
  },
  {
    id: "tavily",
    name: "Tavily",
    description: "AI search engine optimized for research and RAG.",
    logo: "/integrations/tavily.svg",
    category: "productivity",
    tags: ["search", "research", "ai"],
    featured: true,
    status: "available",
    serverUrl: "https://mcp.tavily.com/mcp/",
    authMode: "url_key",
    authKeyParam: "tavilyApiKey",
    docsUrl: "https://docs.tavily.com/documentation/mcp",
    setupInstructions: "Enter your Tavily API key from app.tavily.com.",
    examplePrompts: ["Research the latest trends in AI meeting assistants"],
    sampleResponses: [
      "Top trends: real-time transcription, voice agents, and MCP integrations.",
    ],
  },
  {
    id: "browserbase",
    name: "Browserbase",
    description: "Cloud browser automation for AI agents.",
    logo: "/integrations/browserbase.svg",
    category: "dev-tools",
    tags: ["browser", "automation", "testing"],
    featured: true,
    status: "available",
    serverUrl: "https://mcp.browserbase.com/mcp",
    authMode: "url_key",
    authKeyParam: "browserbaseApiKey",
    docsUrl: "https://docs.browserbase.com/integrations/mcp/setup",
    setupInstructions:
      "Enter your Browserbase API key from browserbase.com/dashboard.",
    examplePrompts: ["Open our landing page and check if the CTA is visible"],
    sampleResponses: [
      "Page loaded in 1.2s. CTA button is visible above the fold.",
    ],
  },
  {
    id: "neon",
    name: "Neon",
    description: "Manage serverless Postgres databases and run SQL queries.",
    logo: "/integrations/neon.svg",
    category: "dev-tools",
    tags: ["database", "postgres", "serverless"],
    featured: true,
    status: "available",
    serverUrl: "https://mcp.neon.tech/mcp",
    authMode: "token",
    docsUrl: "https://neon.com/docs/ai/neon-mcp-server",
    setupInstructions:
      "Enter your Neon API key from console.neon.tech/app/settings/api-keys.",
    examplePrompts: ["How many users signed up this week?"],
    sampleResponses: ["142 new users this week, up 23% from last week."],
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    description: "Manage Workers, KV, R2, DNS, and other Cloudflare services.",
    logo: "/integrations/cloudflare.svg",
    category: "dev-tools",
    tags: ["cloud", "cdn", "workers"],
    featured: true,
    status: "available",
    serverUrl: "https://mcp.cloudflare.com/mcp",
    authMode: "token",
    docsUrl:
      "https://developers.cloudflare.com/agents/model-context-protocol/mcp-servers-for-cloudflare/",
    setupInstructions:
      "Enter your Cloudflare API token from dash.cloudflare.com/profile/api-tokens.",
    examplePrompts: ["What's the traffic to our Workers this week?"],
    sampleResponses: ["3.2M requests across 4 Workers, 99.8% success rate."],
  },
  {
    id: "supabase",
    name: "Supabase",
    description: "Manage Postgres databases, auth, and storage.",
    logo: "/integrations/supabase.svg",
    category: "dev-tools",
    tags: ["database", "auth", "storage"],
    featured: true,
    status: "available",
    serverUrl: "https://mcp.supabase.com/mcp",
    authMode: "token",
    docsUrl: "https://supabase.com/docs/guides/getting-started/mcp",
    setupInstructions:
      "Enter your Supabase access token from supabase.com/dashboard/account/tokens.",
    examplePrompts: ["How many active users do we have?"],
    sampleResponses: ["1,247 active users in the last 7 days."],
  },
  {
    id: "apify",
    name: "Apify",
    description: "Access 4,000+ web scraping and automation actors.",
    logo: "/integrations/apify.svg",
    category: "dev-tools",
    tags: ["scraping", "automation", "data"],
    featured: true,
    status: "available",
    serverUrl: "https://mcp.apify.com",
    authMode: "token",
    docsUrl: "https://docs.apify.com/platform/integrations/mcp-server",
    setupInstructions:
      "Enter your Apify API token from console.apify.com/account/integrations.",
    examplePrompts: ["Scrape product prices from our competitor's site"],
    sampleResponses: ["Found 24 products. Average price $49."],
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Connect 7,000+ apps and automate workflows.",
    logo: "/integrations/zapier.svg",
    category: "productivity",
    tags: ["automation", "workflows", "integrations"],
    featured: true,
    status: "available",
    serverUrl: "https://mcp.zapier.com/api/mcp/mcp",
    authMode: "api_key",
    docsUrl: "https://zapier.com/mcp",
    setupInstructions: "Enter your Zapier MCP API key from zapier.com/mcp.",
    examplePrompts: ["Send a Slack message to #team when this meeting ends"],
    sampleResponses: [
      "Zap triggered: meeting summary will be posted to #team.",
    ],
  },
  {
    id: "telnyx",
    name: "Telnyx",
    description: "Voice calls, SMS, and messaging APIs.",
    logo: "/integrations/telnyx.svg",
    category: "communication",
    tags: ["voice", "sms", "messaging"],
    featured: true,
    status: "available",
    serverUrl: "https://api.telnyx.com/v2/mcp",
    authMode: "api_key",
    docsUrl: "https://developers.telnyx.com",
    setupInstructions: "Enter your Telnyx API key from portal.telnyx.com.",
    examplePrompts: ["Send an SMS to the team about the meeting recap"],
    sampleResponses: ["SMS sent to 3 team members with the meeting summary."],
  },
  {
    id: "context7",
    name: "Context7",
    description: "Up-to-date code documentation for any library.",
    logo: "/integrations/context7.svg",
    category: "dev-tools",
    tags: ["documentation", "code", "reference"],
    featured: true,
    status: "available",
    serverUrl: "https://mcp.context7.com/mcp",
    authMode: "api_key",
    docsUrl: "https://context7.com",
    setupInstructions:
      "Enter your Context7 API key from context7.com/dashboard.",
    examplePrompts: ["What's the latest API for React Server Components?"],
    sampleResponses: ["React 19 Server Components use 'use server' directive."],
  },

  // ── Coming soon (OAuth app registration needed) ──────────────────────
  {
    id: "slack",
    name: "Slack",
    description:
      "Search messages, channels, and users. Send follow-ups after meetings.",
    logo: "/integrations/slack.svg",
    category: "communication",
    tags: ["messaging", "notifications", "team-chat"],
    featured: true,
    status: "coming-soon",
    serverUrl: "https://mcp.slack.com/mcp",
    authMode: "oauth",
    docsUrl: "https://docs.slack.dev/ai/slack-mcp-server/",
    setupInstructions:
      "Click Connect to authorize Vernix with your Slack workspace.",
    examplePrompts: [
      "What did the team discuss in #engineering today?",
      "Send a follow-up to #product-updates about what we decided",
    ],
    sampleResponses: [
      "The team discussed the Q3 roadmap and agreed to prioritize the API redesign.",
    ],
  },
  {
    id: "linear",
    name: "Linear",
    description:
      "Check sprint status, look up issues, and create tasks from meetings.",
    logo: "/integrations/linear.svg",
    category: "project-management",
    tags: ["issues", "sprints", "project-tracking"],
    featured: true,
    status: "coming-soon",
    serverUrl: "https://mcp.linear.app/mcp",
    authMode: "oauth",
    docsUrl: "https://linear.app/docs/mcp",
    setupInstructions:
      "Click Connect to authorize Vernix with your Linear workspace.",
    examplePrompts: [
      "What's left in the current sprint?",
      "Create a ticket for the bug we just discussed",
    ],
    sampleResponses: [
      "There are 5 open issues in Sprint 24: 2 high priority, 3 medium.",
    ],
  },
  {
    id: "notion",
    name: "Notion",
    description:
      "Search pages, databases, and wiki content for context during calls.",
    logo: "/integrations/notion.svg",
    category: "productivity",
    tags: ["wiki", "docs", "databases"],
    featured: true,
    status: "coming-soon",
    serverUrl: "https://mcp.notion.com/mcp",
    authMode: "oauth",
    docsUrl: "https://developers.notion.com/docs/mcp",
    setupInstructions:
      "Click Connect to authorize Vernix with your Notion workspace.",
    examplePrompts: [
      "What does our product roadmap say about Q4?",
      "Find the onboarding checklist in Notion",
    ],
    sampleResponses: [
      "The Q4 roadmap lists 3 priorities: integrations, mobile app, and enterprise features.",
    ],
  },
  {
    id: "jira",
    name: "Jira",
    description:
      "Look up tickets, check sprint boards, and track project progress.",
    logo: "/integrations/jira.svg",
    category: "project-management",
    tags: ["issues", "sprints", "agile"],
    featured: true,
    status: "coming-soon",
    serverUrl: "https://mcp.atlassian.com/v1/mcp",
    authMode: "oauth",
    docsUrl:
      "https://support.atlassian.com/atlassian-rovo-mcp-server/docs/getting-started-with-the-atlassian-remote-mcp-server/",
    setupInstructions:
      "Click Connect to authorize Vernix with your Atlassian account. Covers Jira and Confluence.",
    examplePrompts: [
      "What's the status of PROJ-123?",
      "How many tickets are in the current sprint?",
    ],
    sampleResponses: [
      "PROJ-123 is in progress, assigned to Alice, due Friday.",
    ],
  },
  {
    id: "confluence",
    name: "Confluence",
    description: "Search wiki pages, spaces, and documentation.",
    logo: "/integrations/confluence.svg",
    category: "productivity",
    tags: ["wiki", "docs", "knowledge-base"],
    featured: true,
    status: "coming-soon",
    serverUrl: "https://mcp.atlassian.com/v1/mcp",
    authMode: "oauth",
    docsUrl:
      "https://support.atlassian.com/atlassian-rovo-mcp-server/docs/getting-started-with-the-atlassian-remote-mcp-server/",
    setupInstructions:
      "Click Connect to authorize Vernix with your Atlassian account. Covers Jira and Confluence.",
    examplePrompts: ["What does our architecture doc say about the auth flow?"],
    sampleResponses: [
      "The auth doc describes a JWT-based flow with refresh tokens.",
    ],
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description:
      "Look up contacts, deals, and company data during client calls.",
    logo: "/integrations/hubspot.svg",
    category: "crm",
    tags: ["contacts", "deals", "sales"],
    featured: true,
    status: "coming-soon",
    serverUrl: "https://mcp.hubspot.com",
    authMode: "oauth",
    docsUrl:
      "https://developers.hubspot.com/docs/apps/developer-platform/build-apps/integrate-with-the-remote-hubspot-mcp-server",
    setupInstructions:
      "Click Connect to authorize Vernix with your HubSpot account.",
    examplePrompts: [
      "What's the deal size for Acme Corp?",
      "When was our last interaction with this contact?",
    ],
    sampleResponses: [
      "Acme Corp has an open deal worth $45,000 in the negotiation stage.",
    ],
  },
  {
    id: "asana",
    name: "Asana",
    description: "Track projects, tasks, and team workloads.",
    logo: "/integrations/asana.svg",
    category: "project-management",
    tags: ["tasks", "projects", "teams"],
    featured: true,
    status: "coming-soon",
    serverUrl: "https://mcp.asana.com/v2/mcp",
    authMode: "oauth",
    docsUrl: "https://developers.asana.com/docs/mcp-server",
    setupInstructions:
      "Click Connect to authorize Vernix with your Asana workspace.",
    examplePrompts: ["What tasks are overdue in the marketing project?"],
    sampleResponses: ["3 tasks are overdue, all assigned to Alice."],
  },
  {
    id: "figma",
    name: "Figma",
    description: "Look up design files, components, and comments.",
    logo: "/integrations/figma.svg",
    category: "dev-tools",
    tags: ["design", "prototyping", "ui"],
    featured: true,
    status: "coming-soon",
    serverUrl: "https://mcp.figma.com/mcp",
    authMode: "oauth",
    docsUrl:
      "https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/",
    setupInstructions:
      "Click Connect to authorize Vernix with your Figma account.",
    examplePrompts: ["What comments are on the latest homepage design?"],
    sampleResponses: ["There are 4 unresolved comments on the hero section."],
  },
  {
    id: "gitlab",
    name: "GitLab",
    description: "Check merge requests, pipelines, and issues.",
    logo: "/integrations/gitlab.svg",
    category: "dev-tools",
    tags: ["code", "ci-cd", "merge-requests"],
    featured: true,
    status: "coming-soon",
    serverUrl: "https://gitlab.com/api/v4/mcp",
    authMode: "oauth",
    docsUrl:
      "https://docs.gitlab.com/user/gitlab_duo/model_context_protocol/mcp_server/",
    setupInstructions:
      "Click Connect to authorize Vernix with your GitLab account.",
    examplePrompts: ["Are there any failed pipelines on main?"],
    sampleResponses: ["Pipeline #1234 failed 2 hours ago on the test stage."],
  },
  {
    id: "intercom",
    name: "Intercom",
    description: "Access conversations, contacts, and help center articles.",
    logo: "/integrations/intercom.svg",
    category: "crm",
    tags: ["support", "messaging", "customer-success"],
    featured: true,
    status: "coming-soon",
    serverUrl: "https://mcp.intercom.com/mcp",
    authMode: "oauth",
    docsUrl: "https://developers.intercom.com/docs/guides/mcp",
    setupInstructions:
      "Click Connect to authorize Vernix with your Intercom workspace.",
    examplePrompts: ["What's the latest conversation with this customer?"],
    sampleResponses: ["Last message was 2 days ago about a billing question."],
  },
  {
    id: "monday",
    name: "Monday.com",
    description: "Track workflows, items, and team updates.",
    logo: "/integrations/monday.svg",
    category: "project-management",
    tags: ["workflows", "boards", "automation"],
    featured: true,
    status: "coming-soon",
    serverUrl: "https://mcp.monday.com/mcp",
    authMode: "oauth",
    docsUrl:
      "https://support.monday.com/hc/en-us/articles/28588158981266-Get-started-with-monday-MCP",
    setupInstructions:
      "Click Connect to authorize Vernix with your Monday.com account.",
    examplePrompts: ["What's the status of the onboarding workflow?"],
    sampleResponses: ["3 of 8 items are complete, 2 are stuck."],
  },
  {
    id: "dropbox",
    name: "Dropbox",
    description: "Search files and shared folders.",
    logo: "/integrations/dropbox.svg",
    category: "productivity",
    tags: ["files", "storage", "sharing"],
    featured: true,
    status: "coming-soon",
    serverUrl: "https://mcp.dropbox.com/mcp",
    authMode: "oauth",
    docsUrl: "https://help.dropbox.com/integrations/connect-dropbox-mcp-server",
    setupInstructions:
      "Click Connect to authorize Vernix with your Dropbox account.",
    examplePrompts: ["What files were shared with me recently?"],
    sampleResponses: ["3 files shared in the last week."],
  },
  {
    id: "discord",
    name: "Discord",
    description: "Search messages, channels, and server activity.",
    logo: "/integrations/discord.svg",
    category: "communication",
    tags: ["messaging", "community", "voice"],
    featured: false,
    status: "coming-soon",
    serverUrl: null,
    authMode: "token",
    docsUrl: "https://discord.com/developers",
    setupInstructions: "Coming soon.",
    examplePrompts: ["What's being discussed in #general?"],
    sampleResponses: ["The team is discussing the launch timeline."],
  },
  {
    id: "zendesk",
    name: "Zendesk",
    description: "Look up support tickets, customer issues, and SLA status.",
    logo: "/integrations/zendesk.svg",
    category: "crm",
    tags: ["support", "tickets", "customer-service"],
    featured: false,
    status: "coming-soon",
    serverUrl: null,
    authMode: "api_key",
    docsUrl: "https://developer.zendesk.com/",
    setupInstructions: "Coming soon.",
    examplePrompts: ["How many open tickets does Acme Corp have?"],
    sampleResponses: ["Acme Corp has 3 open tickets, 1 high priority."],
  },
  {
    id: "trello",
    name: "Trello",
    description: "Check boards, cards, and list progress.",
    logo: "/integrations/trello.svg",
    category: "project-management",
    tags: ["kanban", "boards", "cards"],
    featured: false,
    status: "coming-soon",
    serverUrl: null,
    authMode: "api_key",
    docsUrl: "https://developer.atlassian.com/cloud/trello/",
    setupInstructions: "Coming soon.",
    examplePrompts: ["How many cards are in the 'In Progress' column?"],
    sampleResponses: ["There are 7 cards in progress, 3 due this week."],
  },
  {
    id: "sentry",
    name: "Sentry",
    description: "Look up errors, performance issues, and release health.",
    logo: "/integrations/sentry.svg",
    category: "dev-tools",
    tags: ["errors", "monitoring", "debugging"],
    featured: true,
    status: "coming-soon",
    serverUrl: "https://mcp.sentry.dev/mcp",
    authMode: "oauth",
    docsUrl: "https://docs.sentry.io/product/sentry-mcp/",
    setupInstructions: "Coming soon.",
    examplePrompts: ["What errors are spiking in production?"],
    sampleResponses: [
      "TypeError in checkout.ts:142 — 340 events in the last hour, affecting 12% of users.",
    ],
  },
  {
    id: "paypal",
    name: "PayPal",
    description: "Check transactions, process refunds, and manage payments.",
    logo: "/integrations/paypal.svg",
    category: "other",
    tags: ["payments", "transactions", "invoices"],
    featured: true,
    status: "coming-soon",
    serverUrl: "https://www.paypal.ai/",
    authMode: "oauth",
    docsUrl: "https://docs.paypal.ai/developer/tools/ai/mcp-quickstart",
    setupInstructions: "Coming soon.",
    examplePrompts: ["What's the status of the last payment from Acme Corp?"],
    sampleResponses: [
      "Payment of $4,500 received 2 days ago, settled to your account.",
    ],
  },
];

// Validate all entries at import time
for (const entry of CATALOG) {
  integrationSchema.parse(entry);
}

// ---------------------------------------------------------------------------
// Loader functions
// ---------------------------------------------------------------------------

export function getIntegrations(): Integration[] {
  return CATALOG;
}

export function getFeaturedIntegrations(): Integration[] {
  return CATALOG.filter((i) => i.featured);
}

export const CATEGORIES: { value: IntegrationCategory; label: string }[] = [
  { value: "communication", label: "Communication" },
  { value: "project-management", label: "Project Management" },
  { value: "dev-tools", label: "Dev Tools" },
  { value: "crm", label: "CRM" },
  { value: "productivity", label: "Productivity" },
  { value: "other", label: "Other" },
];
