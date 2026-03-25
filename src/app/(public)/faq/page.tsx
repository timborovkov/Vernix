import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ — Vernix",
  description:
    "Frequently asked questions about Vernix — platform support, voice agent, silent mode, data security, document uploads, and MCP integration.",
};

const QUESTIONS = [
  {
    q: "What is Vernix?",
    a: "Vernix is an AI-powered meeting assistant that joins your video calls as a participant. It transcribes conversations in real time, generates summaries, extracts action items, and provides a voice agent that can answer questions using context from your meetings and uploaded documents.",
  },
  {
    q: "Which video platforms are supported?",
    a: "Vernix supports Zoom, Google Meet, Microsoft Teams, and Webex. Simply paste the meeting join link and the agent will join automatically.",
  },
  {
    q: "How does the voice agent work?",
    a: "The voice agent uses the OpenAI Realtime API to listen and respond during your call. When you address it by name, it searches through meeting transcripts and your knowledge base using RAG (Retrieval-Augmented Generation) to provide accurate, context-aware answers.",
  },
  {
    q: "What is silent mode?",
    a: "Silent mode lets the agent join your call without any audio presence. Instead of responding by voice, it monitors the transcript and replies via the meeting chat when mentioned. This is useful for meetings where a voice agent would be disruptive.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. All data is scoped to your account — no one else can access your meetings, transcripts, or documents. Transcripts are stored in a vector database for search, and documents are stored in S3-compatible object storage. We never share your data with third parties.",
  },
  {
    q: "Can I use my own documents?",
    a: "Absolutely. Upload PDF, DOCX, TXT, or Markdown files to your knowledge base. Documents are chunked, embedded, and made available to the agent for RAG-powered answers. You can also upload documents scoped to a specific meeting.",
  },
  {
    q: "What is MCP integration?",
    a: "MCP (Model Context Protocol) allows you to connect external tools to Vernix. You can expose your meeting data to tools like Claude Desktop or Cursor, and connect external MCP servers to give your agent access to additional capabilities.",
  },
  {
    q: "Can I export my data?",
    a: "Yes. You can export individual meetings as PDF or Markdown, or bulk export all meetings as a ZIP archive containing Markdown files and metadata.",
  },
  {
    q: "Do all participants need to consent to recording?",
    a: "Yes. You are responsible for obtaining consent from all call participants before using Vernix. Recording laws vary by jurisdiction — some require all-party consent, others require only one-party consent. We recommend informing all participants that an AI assistant will be joining the call.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes. You can get started with 5 meetings at no cost, including live transcription, AI summaries, and action item extraction. No credit card required.",
  },
  {
    q: "What happens to my data if I cancel?",
    a: "You can export all your data before canceling. After account deletion, your meetings, transcripts, documents, and all associated data are permanently removed from our systems.",
  },
  {
    q: "Does Vernix store meeting recordings?",
    a: "Vernix does not store audio or video recordings. It processes the audio stream in real time for transcription, but only the text transcript is stored — not the raw audio.",
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
