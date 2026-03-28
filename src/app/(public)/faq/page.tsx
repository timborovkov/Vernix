import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Frequently Asked Questions | Vernix AI Meeting Assistant",
  description:
    "How does Vernix work? What platforms are supported? Is my data safe? Answers to common questions about the AI meeting assistant.",
};

const QUESTIONS = [
  {
    q: "What is Vernix?",
    a: "Vernix is an AI meeting agent that joins your video calls as a participant. It transcribes conversations in real time, generates summaries, extracts action items, and provides a voice agent that can answer questions using context from your meetings and uploaded documents.",
  },
  {
    q: "Which video platforms are supported?",
    a: "Vernix supports Zoom, Google Meet, Microsoft Teams, and Webex. Paste the meeting join link and the agent joins automatically.",
  },
  {
    q: "How does the voice agent work?",
    a: "The voice agent listens during your call and responds when addressed by name. It searches through meeting transcripts and your knowledge base to give accurate, context-aware answers. It only activates when you speak to it, so it stays quiet until needed.",
  },
  {
    q: "What is silent mode?",
    a: "Silent mode lets the agent join your call without any audio presence. Instead of responding by voice, it monitors the transcript and replies via the meeting chat when mentioned. Useful for meetings where a voice agent would be disruptive.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes. The free plan gives you 30 minutes of silent meetings per month with transcription, summaries, action items, and RAG chat. No credit card needed, no time limit — it's free forever.",
  },
  {
    q: "How does the free trial work?",
    a: "When you sign up, you get a 14-day trial of Pro with 90 minutes of meeting time (voice or silent). After the trial ends or you use up the 90 minutes, you fall back to the free plan. No credit card required.",
  },
  {
    q: "How does pricing work?",
    a: "Pro is €29/mo and includes €30 of usage credit. Voice meetings cost €3/hr. Silent meetings cost €1.50/hr. Most users stay within the €30 credit and pay a flat €29/mo. If you go over, you only pay for the extra usage. You can set a monthly spending cap to avoid surprises.",
  },
  {
    q: "What counts as usage?",
    a: "Meeting time is the main usage metric. A 1-hour voice meeting uses €3 of credit. A 1-hour silent meeting uses €1.50. Post-meeting chat, summaries, and action items are included at no extra cost. Your €30 monthly credit covers roughly 10 hours of voice meetings or 20 hours of silent meetings.",
  },
  {
    q: "Can I use my own documents?",
    a: "Yes. Upload PDF, DOCX, TXT, or Markdown files to your knowledge base. Documents are processed and made available to the agent for context-aware answers. You can also upload documents scoped to a specific meeting.",
  },
  {
    q: "What is MCP integration?",
    a: "MCP (Model Context Protocol) lets you connect external tools to Vernix. You can expose your meeting data to tools like Claude Desktop or Cursor, and connect external MCP servers to give your agent access to additional capabilities. Available on Pro.",
  },
  {
    q: "Is my data secure?",
    a: "All data is scoped to your account — no one else can access your meetings, transcripts, or documents. Transcripts are stored in a vector database for search, and documents are stored in encrypted object storage. We never share your data with third parties.",
  },
  {
    q: "Does Vernix store meeting recordings?",
    a: "No. Vernix processes the audio stream in real time for transcription, but only the text transcript is stored — not the raw audio or video.",
  },
  {
    q: "Do participants need to consent to recording?",
    a: "Yes. You are responsible for obtaining consent from all call participants. Recording laws vary by jurisdiction. We recommend informing participants that an AI assistant will be joining the call.",
  },
  {
    q: "Can I export my data?",
    a: "Yes. Export individual meetings as PDF or Markdown, or bulk export all meetings as a ZIP archive. Your data is always yours.",
  },
  {
    q: "What happens if I cancel Pro?",
    a: "You fall back to the free plan. Your existing meetings, transcripts, and documents stay accessible (read-only for anything over free limits). You can export everything at any time. Re-subscribe whenever you want — nothing is deleted.",
  },
];

export default function FAQPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24">
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
