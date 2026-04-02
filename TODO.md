# TODO

## Security Hardening & Infra Go-Live Check

- **Migrate from Next.js middleware to proxy** - The "middleware" file convention is deprecated. Please use "proxy" instead. Learn more: https://nextjs.org/docs/messages/middleware-to-proxy
- **Set provider usage caps** — Add usage caps in OpenAI, Recall, and other third-party services.
- **Set Railway usage caps** — Add spend/usage caps and guardrails in Railway.
- **Configure alerting** — Configure alerts for cost, error rate, downtime, and abuse signals.
- **Run security scan & audit** — Run a security scan/audit, then track/fix findings.
- **Block malicious bots** — Add bot blocking at app/edge level.
- **Collect and attribute usage telemetry** — Track token usage, Recall usage, and related costs.
- **Configure LLM tracing** — Configure something like Langsmith tracing for all AI agents and tools. (note, we use OpenAI, so Langsmith is probably not the best choice)

## Marketing materials

- **Demo video** — Create a new demo video for the website, explaining what Vernix is, how it works, and how to use it. Something like a Loom
- **Animated video** — Create a new animated video for the website, explaining what Vernix is, how it works, and how to use it. Using https://www.remotion.dev/
- **Visual assets using Recraft** — Create a visual assets for marketing, showing features, use cases, and benefits using Recraft.
- **Launch posts** - Linkedin, Hacker News, Reddit, Product Hunt, Twitter, Instagram, etc. Write 3 launch posts. Explain the story, the hackathon project, the problem we solved, the solution, the benefits, the technology stack, etc.

## Scoped Context, Tools and Data Access

- **Context groups** — Solution to the problem of context leakage, too many tools, too many data sources, too much context. We don't want the Vernix assistant to leak private information on public calls for example.
- **Data access scoping via Groups/Tags** — Add a grouping model for knowledge documents, calls, and MCP tool connections, then scope agent access by selected group(s) per call. Primary goal is preventing context leakage.
- **Multiple connections to the same tool** — Allow multiple MCP integration connections to the same tool. The user might a member of multiple teams, projects, and organizations, and each might have a Notion or Linear workspace.
- **List tools in the UI** — List available tools from MCP integrations in the UI, so the user can see what they can connect to.
- **Allow toggling tools on/off** — Allow the user to toggle tools provided by MCP integrations on/off in the UI, so they can control which tools are available to the agent.
- **Integration list APIs and MCP server tool updates** — Update the integration list APIs and MCP server tools to show what tools each integration provides, what is enabled/disabled.
- **Scoped context, tools and data access in MCP server and public APISs** — Update the MCP server and public APIs to use the new scoped context, tools and data access model. They should show what belongs where, allow for filtering and sorting by context group, allow creating new context groups, modifying existing context groups, deleting context groups, adding and removing things from context groups, etc.
- **Update public documentation** — Update the public documentation to reflect the new scoped context, tools and data access model, e.g. context groups.
- **Website feature page for context groups** — Create a new feature page for context groups, explaining what they are, how to use them, and how to create them.
- **Update website content** — Update the website content to reflect the new scoped context, tools and data access model, e.g. context groups. This affects the landing page, the FAQ, etc.
- **New blog post about context groups** — Write a new blog post about context groups, generate thumbnail with nanobanana, explaining what they are, what problems they solve, how to use them, and how to create them.

## Agent Skill for Vernix

- **Agent skill for Vernix** — Create a agent skill for Vernix. The skill would allow agents like Claude or Open Claw to use Vernix to join calls, search meetings, search tasks, search knowledge base, and other tools.
- **Make a page for the agent skill for Vernix** — Create a new page for the agent skill for Vernix, explaining what it is, how to use it.
- **Update public documentation** — Update the public documentation to reflect the new agent skill for Vernix.
- **Update website content** — Update the website content to reflect the new agent skill for Vernix. This affects the landing page, the FAQ, etc.
- **New blog post about agent skill for Vernix** — Write a new blog post about agent skill for Vernix, generate thumbnail with nanobanana, explaining what it is, what problems it solves, how to use it.

## Hidden mode

- **Hidden mode** — Create a hidden mode for Vernix. The hidden mode would allow the user to use Vernix without being visible to the other participants in the call. This is useful for private calls, or calls where the user wants to use Vernix without being visible to the other participants.
- **Browser plugin** - One option would be to have a browser plugin for this.
- **UI to show agentic responses while hidden** - A UI element / page to show what the agent is up to, show responses etc, but only to the user. No one else in the call should see this.
- **No wake word** - Agent should silently respond without being directly triggered by a wake word.
- **Update APIs, MCP server, docs** - Update the APIs, MCP server, and docs to support the hidden mode.
- **New blog post about hidden mode** — Write a new blog post about hidden mode, generate thumbnail with nanobanana, explaining what it is, what problems it solves, how to use it.
- **Website feature page for hidden mode** — Create a new feature page for hidden mode, explaining what it is, how to use it.
- **Update website content** — Update the website content to reflect the new hidden mode. This affects the landing page, the FAQ, etc.
- **New blog post about hidden mode** — Write a new blog post about hidden mode, generate thumbnail with nanobanana, explaining what it is, what problems it solves, how to use it.

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
