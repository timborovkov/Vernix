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
  {
    id: "slack",
    name: "Slack",
    description:
      "Search messages, channels, and users. Send follow-ups after meetings.",
    logo: "/integrations/slack.svg",
    category: "communication",
    tags: ["messaging", "notifications", "team-chat"],
    featured: true,
    status: "available",
    serverUrl: "https://mcp.slack.com/mcp",
    authMode: "oauth",
    docsUrl: "https://api.slack.com/tutorials/mcp",
    setupInstructions:
      "Click Connect to authorize Vernix with your Slack workspace via OAuth.",
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
    status: "available",
    serverUrl: null,
    authMode: "api_key",
    docsUrl: "https://github.com/joshduffy/mcp-servers",
    setupInstructions:
      "Requires a self-hosted Linear MCP server. Deploy the server, enter its URL, and add your Linear API key from linear.app/settings/api.",
    examplePrompts: [
      "What's left in the current sprint?",
      "Create a ticket for the bug we just discussed",
    ],
    sampleResponses: [
      "There are 5 open issues in Sprint 24: 2 high priority, 3 medium.",
    ],
  },
  {
    id: "github",
    name: "GitHub",
    description: "Check PRs, review commits, and look up repository activity.",
    logo: "/integrations/github.svg",
    category: "dev-tools",
    tags: ["code", "pull-requests", "repositories"],
    featured: true,
    status: "available",
    serverUrl: null,
    authMode: "token",
    docsUrl:
      "https://github.com/modelcontextprotocol/servers/tree/main/src/github",
    setupInstructions:
      "Requires a self-hosted GitHub MCP server. Deploy @modelcontextprotocol/server-github, enter its URL, and add a GitHub Personal Access Token.",
    examplePrompts: [
      "What changed in the last deploy?",
      "Show me open PRs on the main repo",
    ],
    sampleResponses: [
      "The last deploy included 3 PRs: auth fix, billing update, and UI polish.",
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
    status: "available",
    serverUrl: null,
    authMode: "token",
    docsUrl: "https://github.com/makenotion/notion-mcp-server",
    setupInstructions:
      "Requires a self-hosted Notion MCP server. Deploy @notionhq/notion-mcp-server, enter its URL, and add a Notion Internal Integration Secret from notion.so/my-integrations.",
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
    featured: false,
    status: "available",
    serverUrl: null,
    authMode: "api_key",
    docsUrl:
      "https://github.com/modelcontextprotocol/servers/tree/main/src/atlassian",
    setupInstructions:
      "Requires a self-hosted Jira MCP server. Deploy the Atlassian MCP server, enter its URL, and add a Jira API token from your Atlassian account settings.",
    examplePrompts: [
      "What's the status of PROJ-123?",
      "How many tickets are in the current sprint?",
    ],
    sampleResponses: [
      "PROJ-123 is in progress, assigned to Alice, due Friday.",
    ],
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description:
      "Check schedules, find meeting conflicts, and look up upcoming events.",
    logo: "/integrations/google-calendar.svg",
    category: "productivity",
    tags: ["calendar", "scheduling", "events"],
    featured: false,
    status: "coming-soon",
    serverUrl: null,
    authMode: "oauth",
    docsUrl: "https://developers.google.com/calendar",
    setupInstructions: "Connect via Google OAuth (coming soon).",
    examplePrompts: [
      "When is the next meeting with the design team?",
      "Do I have any conflicts on Thursday?",
    ],
    sampleResponses: [
      "Your next meeting with the design team is Wednesday at 2pm.",
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
    featured: false,
    status: "coming-soon",
    serverUrl: null,
    authMode: "api_key",
    docsUrl: "https://developers.hubspot.com/docs/api/private-apps",
    setupInstructions:
      "Create a private app in HubSpot and paste the access token (coming soon).",
    examplePrompts: [
      "What's the deal size for Acme Corp?",
      "When was our last interaction with this contact?",
    ],
    sampleResponses: [
      "Acme Corp has an open deal worth $45,000 in the negotiation stage.",
    ],
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description:
      "Access accounts, opportunities, and customer records in real-time.",
    logo: "/integrations/salesforce.svg",
    category: "crm",
    tags: ["accounts", "opportunities", "sales"],
    featured: false,
    status: "coming-soon",
    serverUrl: null,
    authMode: "oauth",
    docsUrl: "https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta",
    setupInstructions: "Connect via Salesforce OAuth (coming soon).",
    examplePrompts: [
      "Pull up the account details for this client",
      "What opportunities are closing this quarter?",
    ],
    sampleResponses: [
      "There are 12 opportunities closing this quarter, total pipeline $380K.",
    ],
  },
  // Additional integrations (coming soon, featured for logo cloud)
  {
    id: "asana",
    name: "Asana",
    description: "Track projects, tasks, and team workloads.",
    logo: "/integrations/asana.svg",
    category: "project-management",
    tags: ["tasks", "projects", "teams"],
    featured: true,
    status: "coming-soon",
    serverUrl: null,
    authMode: "token",
    docsUrl: "https://developers.asana.com",
    setupInstructions: "Coming soon.",
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
    serverUrl: null,
    authMode: "token",
    docsUrl: "https://www.figma.com/developers",
    setupInstructions: "Coming soon.",
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
    serverUrl: null,
    authMode: "token",
    docsUrl: "https://docs.gitlab.com/api/",
    setupInstructions: "Coming soon.",
    examplePrompts: ["Are there any failed pipelines on main?"],
    sampleResponses: ["Pipeline #1234 failed 2 hours ago on the test stage."],
  },
  {
    id: "discord",
    name: "Discord",
    description: "Search messages, channels, and server activity.",
    logo: "/integrations/discord.svg",
    category: "communication",
    tags: ["messaging", "community", "voice"],
    featured: true,
    status: "coming-soon",
    serverUrl: null,
    authMode: "token",
    docsUrl: "https://discord.com/developers",
    setupInstructions: "Coming soon.",
    examplePrompts: ["What's being discussed in #general?"],
    sampleResponses: ["The team is discussing the launch timeline."],
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
    serverUrl: null,
    authMode: "api_key",
    docsUrl: "https://developer.atlassian.com/cloud/confluence/",
    setupInstructions: "Coming soon.",
    examplePrompts: ["What does our architecture doc say about the auth flow?"],
    sampleResponses: [
      "The auth doc describes a JWT-based flow with refresh tokens.",
    ],
  },
  {
    id: "zendesk",
    name: "Zendesk",
    description: "Look up support tickets, customer issues, and SLA status.",
    logo: "/integrations/zendesk.svg",
    category: "crm",
    tags: ["support", "tickets", "customer-service"],
    featured: true,
    status: "coming-soon",
    serverUrl: null,
    authMode: "api_key",
    docsUrl: "https://developer.zendesk.com/",
    setupInstructions: "Coming soon.",
    examplePrompts: ["How many open tickets does Acme Corp have?"],
    sampleResponses: ["Acme Corp has 3 open tickets, 1 high priority."],
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
    serverUrl: null,
    authMode: "token",
    docsUrl: "https://developers.intercom.com/",
    setupInstructions: "Coming soon.",
    examplePrompts: ["What's the latest conversation with this customer?"],
    sampleResponses: ["Last message was 2 days ago about a billing question."],
  },
  {
    id: "trello",
    name: "Trello",
    description: "Check boards, cards, and list progress.",
    logo: "/integrations/trello.svg",
    category: "project-management",
    tags: ["kanban", "boards", "cards"],
    featured: true,
    status: "coming-soon",
    serverUrl: null,
    authMode: "api_key",
    docsUrl: "https://developer.atlassian.com/cloud/trello/",
    setupInstructions: "Coming soon.",
    examplePrompts: ["How many cards are in the 'In Progress' column?"],
    sampleResponses: ["There are 7 cards in progress, 3 due this week."],
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
    serverUrl: null,
    authMode: "api_key",
    docsUrl: "https://developer.monday.com/",
    setupInstructions: "Coming soon.",
    examplePrompts: ["What's the status of the onboarding workflow?"],
    sampleResponses: ["3 of 8 items are complete, 2 are stuck."],
  },
  {
    id: "airtable",
    name: "Airtable",
    description: "Query bases, tables, and records.",
    logo: "/integrations/airtable.svg",
    category: "productivity",
    tags: ["databases", "spreadsheets", "records"],
    featured: true,
    status: "coming-soon",
    serverUrl: null,
    authMode: "token",
    docsUrl: "https://airtable.com/developers",
    setupInstructions: "Coming soon.",
    examplePrompts: ["How many leads did we add this week?"],
    sampleResponses: ["12 new leads added, 4 from the webinar campaign."],
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Search files, docs, and shared folders.",
    logo: "/integrations/google-drive.svg",
    category: "productivity",
    tags: ["files", "docs", "storage"],
    featured: true,
    status: "coming-soon",
    serverUrl: null,
    authMode: "oauth",
    docsUrl: "https://developers.google.com/drive",
    setupInstructions: "Coming soon.",
    examplePrompts: ["Find the latest version of the Q4 budget spreadsheet"],
    sampleResponses: ["Found 'Q4 Budget v3' updated yesterday by Alice."],
  },
  {
    id: "dropbox",
    name: "Dropbox",
    description: "Search files and shared folders.",
    logo: "/integrations/dropbox.svg",
    category: "productivity",
    tags: ["files", "storage", "sharing"],
    featured: false,
    status: "coming-soon",
    serverUrl: null,
    authMode: "oauth",
    docsUrl: "https://www.dropbox.com/developers",
    setupInstructions: "Coming soon.",
    examplePrompts: ["What files were shared with me recently?"],
    sampleResponses: ["3 files shared in the last week."],
  },
  {
    id: "bitbucket",
    name: "Bitbucket",
    description: "Check pull requests, branches, and pipelines.",
    logo: "/integrations/bitbucket.svg",
    category: "dev-tools",
    tags: ["code", "pull-requests", "ci-cd"],
    featured: false,
    status: "coming-soon",
    serverUrl: null,
    authMode: "token",
    docsUrl: "https://developer.atlassian.com/cloud/bitbucket/",
    setupInstructions: "Coming soon.",
    examplePrompts: ["Are there any open PRs on the main branch?"],
    sampleResponses: ["2 open PRs, both approved and ready to merge."],
  },
];

// Validate all entries at import time
for (const entry of CATALOG) {
  integrationSchema.parse(entry);
}

// ---------------------------------------------------------------------------
// Loader functions — stable interface for future DB migration.
// Some functions are not yet called but are part of the public API
// so the source can move from code to DB/admin tooling later.
// See docs/integrations.md for rationale.
// ---------------------------------------------------------------------------

export function getIntegrations(): Integration[] {
  return CATALOG;
}

export function getIntegration(id: string): Integration | undefined {
  return CATALOG.find((i) => i.id === id);
}

export function getFeaturedIntegrations(): Integration[] {
  return CATALOG.filter((i) => i.featured);
}

export function getIntegrationsByCategory(
  category: IntegrationCategory
): Integration[] {
  return CATALOG.filter((i) => i.category === category);
}

export function getAvailableIntegrations(): Integration[] {
  return CATALOG.filter((i) => i.status === "available");
}

export const CATEGORIES: { value: IntegrationCategory; label: string }[] = [
  { value: "communication", label: "Communication" },
  { value: "project-management", label: "Project Management" },
  { value: "dev-tools", label: "Dev Tools" },
  { value: "crm", label: "CRM" },
  { value: "productivity", label: "Productivity" },
  { value: "other", label: "Other" },
];
