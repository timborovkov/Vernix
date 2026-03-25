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
} from "lucide-react";

const FEATURES = [
  {
    icon: Mic,
    title: "Live Transcription",
    description:
      "Real-time transcription of your video calls with speaker identification and timestamps.",
  },
  {
    icon: FileText,
    title: "AI Summaries",
    description:
      "Automatic meeting summaries with key decisions, action items, and follow-ups.",
  },
  {
    icon: MessageSquare,
    title: "Voice Agent",
    description:
      "An AI agent that joins your calls, listens, and answers questions using meeting context.",
  },
  {
    icon: BookOpen,
    title: "Knowledge Base",
    description:
      "Upload documents to give your agent context. It uses RAG to answer questions accurately.",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Create a meeting",
    description: "Paste your video call link and optionally add an agenda.",
  },
  {
    step: "2",
    title: "Agent joins your call",
    description:
      "Vernix joins as a participant, transcribes everything, and responds when addressed.",
  },
  {
    step: "3",
    title: "Get transcripts & insights",
    description:
      "Review summaries, search transcripts, extract action items, and chat with your notes.",
  },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-3xl px-4 py-24 text-center">
        <div className="mb-8 flex justify-center">
          <Image
            src="/brand/icon/icon.svg"
            alt="Vernix"
            width={72}
            height={72}
            className="dark:hidden"
          />
          <Image
            src="/brand/icon/icon-dark.png"
            alt="Vernix"
            width={72}
            height={72}
            className="hidden dark:block"
          />
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          AI Video Call Agent
        </h1>
        <p className="text-muted-foreground mx-auto mb-8 max-w-xl text-lg">
          Vernix joins your video calls, transcribes conversations, generates
          summaries, and answers questions using context from current and past
          meetings.
        </p>
        <div className="flex justify-center gap-3">
          <Button size="lg" render={<Link href="/register" />}>
            Get Started
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
          <Button variant="outline" size="lg" render={<a href="#features" />}>
            Learn More
          </Button>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-border border-t py-24">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-4 text-center text-2xl font-bold">
            Everything you need for smarter meetings
          </h2>
          <p className="text-muted-foreground mx-auto mb-12 max-w-xl text-center">
            From live transcription to AI-powered Q&A, Vernix handles the busy
            work so you can focus on what matters.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <Card key={feature.title}>
                <CardContent className="pt-6">
                  <feature.icon className="text-muted-foreground mb-3 h-8 w-8" />
                  <h3 className="mb-1 text-sm font-medium">{feature.title}</h3>
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
          <h2 className="mb-12 text-center text-2xl font-bold">How it works</h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {STEPS.map((item) => (
              <div key={item.step} className="text-center">
                <div className="bg-primary text-primary-foreground mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold">
                  {item.step}
                </div>
                <h3 className="mb-2 text-sm font-medium">{item.title}</h3>
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
            Ready to make your meetings smarter?
          </h2>
          <p className="mb-8 opacity-80">
            Start using Vernix today. No credit card required.
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
