import {
  DISPLAY,
  FREE_TRIAL,
  LIMITS,
  PLANS,
} from "@/lib/billing/constants";
import { getIntegrations, CATEGORIES } from "@/lib/integrations/catalog";

function buildContent(): string {
  const integrations = getIntegrations();

  const integrationsByCategory = CATEGORIES.map((cat) => {
    const items = integrations.filter((i) => i.category === cat.value);
    if (items.length === 0) return "";
    return `### ${cat.label}\n${items.map((i) => `- ${i.name}: ${i.description}`).join("\n")}`;
  })
    .filter(Boolean)
    .join("\n\n");

  return `# Vernix

> An AI assistant that joins your video calls, connects to your tools, and answers questions with real business data during meetings.

## What Vernix Does

Vernix is an AI meeting assistant that joins Zoom, Google Meet, Microsoft Teams, and Webex calls. It connects to tools like Slack, Linear, GitHub, and CRM systems, then answers questions and takes action during the call using live data. It also transcribes conversations, generates summaries, extracts action items, and provides searchable meeting history.

## Key Features

- Tool Integrations: Connect Slack, Linear, GitHub, or your CRM. Ask Vernix during a call and get answers from your connected tools.
- Voice Agent: A live voice agent that listens and responds during calls. Say "Vernix" followed by your question.
- Silent Mode: Text-only agent that responds via meeting chat. No audio, no disruption.
- Meeting Transcription: Real-time, speaker-identified transcription. Searchable immediately.
- AI Summaries: Automatic summaries with key decisions after every call.
- Action Items: Tasks extracted from conversations and tracked per meeting.
- Cross-Meeting Search: Semantic search across all your meetings and documents.
- Knowledge Base: Upload PDFs, DOCX, TXT, or Markdown. The agent uses them during calls.

## Pricing

### Free Plan
- ${LIMITS[PLANS.FREE].meetingsPerMonth} silent meetings per month, ${LIMITS[PLANS.FREE].meetingMinutesPerMonth} minutes total
- ${LIMITS[PLANS.FREE].ragQueriesPerDay} AI queries per day
- ${LIMITS[PLANS.FREE].documentsCount} documents, ${LIMITS[PLANS.FREE].totalStorageMB}MB storage
- No credit card required

### Pro Plan
- ${DISPLAY.proMonthly}/month (or ${DISPLAY.proAnnual}/month billed annually)
- ${FREE_TRIAL.days}-day free trial with ${FREE_TRIAL.totalMinutes} minutes of call time
- Voice agent, silent mode, and tool integrations
- ${LIMITS[PLANS.PRO].documentsCount} documents, ${LIMITS[PLANS.PRO].totalStorageMB}MB storage
- ${LIMITS[PLANS.PRO].ragQueriesPerDay} AI queries per day
- ${DISPLAY.monthlyCredit} monthly usage credit included
- Voice calls: ${DISPLAY.voiceRate}, silent calls: ${DISPLAY.silentRate}
- Credit covers ~${DISPLAY.voiceHoursPerCredit}h voice or ~${DISPLAY.silentHoursPerCredit}h silent per month
- API access (${LIMITS[PLANS.PRO].apiRequestsPerDay} requests/day) and MCP server/client connections

## Available Integrations

${integrationsByCategory}

## Links

- Homepage: https://vernix.app
- Tool Integrations: https://vernix.app/features/integrations
- Meeting Memory: https://vernix.app/features/meeting-memory
- Knowledge Base: https://vernix.app/features/context
- Pricing: https://vernix.app/pricing
- FAQ: https://vernix.app/faq
- Contact: https://vernix.app/contact
`;
}

export function GET() {
  return new Response(buildContent(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
