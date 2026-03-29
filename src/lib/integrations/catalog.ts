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

const authModeEnum = z.enum(["api_key", "token", "oauth", "none"]);

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
