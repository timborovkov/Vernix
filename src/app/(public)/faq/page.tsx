import type { Metadata } from "next";
import { DISPLAY, LIMITS, PLANS, FREE_TRIAL } from "@/lib/billing/constants";

export const metadata: Metadata = {
  title: "Frequently Asked Questions | Vernix AI Call Assistant",
  description:
    "How does Vernix work? What platforms are supported? Is my data safe? Answers to common questions about the AI call assistant.",
};

const QUESTIONS = [
  {
    q: "What is Vernix?",
    a: "Vernix is an AI assistant that joins your video calls. It connects to your tools (Slack, Linear, GitHub, CRM) and answers questions with live business data during the call. It also transcribes conversations, generates summaries, and extracts action items automatically.",
  },
  {
    q: "Which video platforms are supported?",
    a: "Vernix supports Zoom, Google Meet, Microsoft Teams, and Webex. Paste the call link and the agent joins automatically.",
  },
  {
    q: "How does the voice agent work?",
    a: "The voice agent listens during your call and responds when addressed by name. It searches through call transcripts and your knowledge base to give accurate, context-aware answers. It only activates when you speak to it, so it stays quiet until needed.",
  },
  {
    q: "What is silent mode?",
    a: "Silent mode lets the agent join your call without any audio presence. Instead of responding by voice, it monitors the transcript and replies via the call chat when mentioned. Useful for calls where a voice agent would be disruptive.",
  },
  {
    q: "Is there a free plan?",
    a: `Yes. The free plan gives you ${LIMITS[PLANS.FREE].meetingMinutesPerMonth} minutes of silent calls per month with transcription, summaries, action items, and RAG chat. No credit card needed, no time limit — it's free forever.`,
  },
  {
    q: "How does the free trial work?",
    a: `When you upgrade to Pro, you get a ${FREE_TRIAL.days}-day trial with full Pro features and ${FREE_TRIAL.totalMinutes} minutes of call time (voice or silent). After the trial, your subscription activates automatically. You can cancel anytime during the trial.`,
  },
  {
    q: "How does pricing work?",
    a: `Pro is ${DISPLAY.proMonthly}/mo and includes ${DISPLAY.monthlyCredit} of usage credit. Voice calls cost ${DISPLAY.voiceRate}. Silent calls cost ${DISPLAY.silentRate}. Most users stay within the ${DISPLAY.monthlyCredit} credit and pay a flat ${DISPLAY.proMonthly}/mo. If you go over, you only pay for the extra usage. You can set a monthly spending cap to avoid surprises.`,
  },
  {
    q: "What counts as usage?",
    a: `Call time is the main usage metric. A 1-hour voice call uses ${DISPLAY.voiceCost} of credit. A 1-hour silent call uses ${DISPLAY.silentCost}. Post-call chat, summaries, and action items are included at no extra cost. Your ${DISPLAY.monthlyCredit} monthly credit covers roughly ${DISPLAY.voiceHoursPerCredit} hours of voice calls or ${DISPLAY.silentHoursPerCredit} hours of silent calls.`,
  },
  {
    q: "Can I use my own documents?",
    a: "Yes. Upload PDF, DOCX, TXT, or Markdown files to your knowledge base. Documents are processed and made available to the agent for context-aware answers. You can also upload documents scoped to a specific call.",
  },
  {
    q: "What is MCP integration?",
    a: "MCP (Model Context Protocol) lets you connect external tools to Vernix. You can expose your call data to tools like Claude Desktop or Cursor, and connect external MCP servers to give your agent access to additional capabilities. Available on Pro.",
  },
  {
    q: "Is my data secure?",
    a: "All data is scoped to your account — no one else can access your calls, transcripts, or documents. Transcripts are stored in a vector database for search, and documents are stored in encrypted object storage. We never share your data with third parties.",
  },
  {
    q: "Does Vernix store call recordings?",
    a: "No. Vernix processes the audio stream in real time for transcription, but only the text transcript is stored — not the raw audio or video.",
  },
  {
    q: "Do participants need to consent to recording?",
    a: "Yes. You are responsible for obtaining consent from all call participants. Recording laws vary by jurisdiction. We recommend informing participants that an AI assistant will be joining the call.",
  },
  {
    q: "Can I export my data?",
    a: "Yes. Export individual calls as PDF or Markdown, or bulk export all calls as a ZIP archive. Your data is always yours.",
  },
  {
    q: "What happens if I cancel Pro?",
    a: "You fall back to the free plan. Your existing calls, transcripts, and documents stay accessible (read-only for anything over free limits). You can export everything at any time. Re-subscribe whenever you want — nothing is deleted.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: QUESTIONS.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.a,
    },
  })),
};

export default function FAQPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1 className="mb-4 text-center text-3xl font-bold">
        Frequently Asked Questions
      </h1>
      <p className="text-muted-foreground mb-12 text-center">
        Everything you need to know about Vernix.
      </p>

      <div className="divide-border divide-y">
        {QUESTIONS.map((item) => (
          <details key={item.q} className="group py-4">
            <summary className="text-muted-foreground cursor-pointer text-sm font-medium">
              {item.q}
            </summary>
            <div className="faq-answer">
              <div>
                <p className="text-muted-foreground pt-2 text-sm">{item.a}</p>
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
