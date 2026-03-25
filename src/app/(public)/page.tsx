import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Mic,
  FileText,
  MessageSquare,
  BookOpen,
  ArrowRight,
  ListChecks,
  Search,
  VolumeX,
  Plug,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Vernix — AI Video Call Agent",
  description:
    "Vernix joins your video calls, transcribes conversations, generates AI summaries, and answers questions using meeting context. Supports Zoom, Meet, Teams, and Webex.",
};

const FEATURES = [
  {
    icon: Mic,
    title: "Live Transcription",
    description:
      "Real-time, speaker-identified transcription across Zoom, Google Meet, Microsoft Teams, and Webex.",
  },
  {
    icon: FileText,
    title: "AI Summaries & Action Items",
    description:
      "Automatic post-meeting summaries with extracted action items, assignees, and key decisions.",
  },
  {
    icon: MessageSquare,
    title: "Voice Agent",
    description:
      "An AI agent that joins your call, listens in real time, and answers questions out loud using RAG.",
  },
  {
    icon: VolumeX,
    title: "Silent Mode",
    description:
      "A text-only agent that monitors the call and responds via meeting chat when mentioned — no audio disruption.",
  },
  {
    icon: BookOpen,
    title: "Knowledge Base",
    description:
      "Upload PDFs, DOCX, or Markdown files. The agent uses them alongside transcripts to answer questions accurately.",
  },
  {
    icon: Search,
    title: "Cross-Meeting Search",
    description:
      "Search across all your meetings and documents at once. Find what was said, when, and by whom.",
  },
  {
    icon: ListChecks,
    title: "Task Extraction",
    description:
      "Action items are automatically extracted from transcripts and tracked per meeting with completion status.",
  },
  {
    icon: Plug,
    title: "MCP Integration",
    description:
      "Expose your meeting data to Claude Desktop, Cursor, or other tools via the Model Context Protocol.",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Create a meeting",
    description:
      "Paste your Zoom, Meet, Teams, or Webex link. Optionally add an agenda and upload documents.",
  },
  {
    step: "2",
    title: "Agent joins your call",
    description:
      "Vernix joins as a participant — transcribing, listening, and ready to answer when addressed.",
  },
  {
    step: "3",
    title: "Review and act",
    description:
      "Get summaries, action items, and searchable transcripts. Chat with your notes or export as PDF.",
  },
];

const PLATFORMS = ["Zoom", "Google Meet", "Microsoft Teams", "Webex"];

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-3xl px-4 py-24 text-center">
        <div className="mb-8 flex justify-center">
          <Image
            src="/brand/icon/icon.svg"
            alt="Vernix logo"
            width={72}
            height={72}
            className="dark:hidden"
          />
          <Image
            src="/brand/icon/icon-dark.png"
            alt="Vernix logo"
            width={72}
            height={72}
            className="hidden dark:block"
          />
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Your AI teammate for video calls
        </h1>
        <p className="text-muted-foreground mx-auto mb-8 max-w-xl text-lg">
          Vernix joins your calls, transcribes everything, generates summaries,
          and answers questions live — using context from your meetings and
          documents.
        </p>
        <div className="flex justify-center gap-3">
          <Button size="lg" render={<Link href="/register" />}>
            Get Started Free
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
          <Button variant="outline" size="lg" render={<a href="#features" />}>
            See Features
          </Button>
        </div>
        <div className="text-muted-foreground mt-8 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
          {PLATFORMS.map((p) => (
            <span key={p}>{p}</span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-border border-t py-24">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-4 text-center text-2xl font-bold">
            Transcription, summaries, and a voice agent that knows your context
          </h2>
          <p className="text-muted-foreground mx-auto mb-12 max-w-xl text-center">
            Everything you need to capture, search, and act on what happens in
            your meetings.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <Card key={feature.title}>
                <CardContent className="pt-6">
                  <feature.icon className="text-muted-foreground mb-3 h-8 w-8" />
                  <h3 className="mb-1 font-medium">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-border border-t py-24">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="mb-12 text-center text-2xl font-bold">
            How it works
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {STEPS.map((item) => (
              <div key={item.step} className="text-center">
                <div className="bg-primary text-primary-foreground mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold">
                  {item.step}
                </div>
                <h3 className="mb-2 font-medium">{item.title}</h3>
                <p className="text-muted-foreground text-sm">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-primary-foreground py-24">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="mb-4 text-2xl font-bold">
            Stop taking notes. Start having better meetings.
          </h2>
          <p className="mb-8 opacity-80">
            Get started in under a minute. No credit card required.
          </p>
          <Button
            size="lg"
            variant="secondary"
            render={<Link href="/register" />}
          >
            Get Started Free
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </section>
    </>
  );
}
