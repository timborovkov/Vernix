import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollReveal } from "@/components/scroll-reveal";
import { IntegrationCloud } from "@/components/integration-cloud";
import { HeroBg } from "@/components/hero-bg";
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
  Video,
} from "lucide-react";
import { DISPLAY, LIMITS, PLANS, PRICING } from "@/lib/billing/constants";

export const metadata: Metadata = {
  title: "Vernix — AI Assistant for Video Calls | Live Data from Your Tools",
  description:
    "An AI agent that joins Zoom, Meet, Teams, and Webex. Connects to Slack, Linear, GitHub. Answers questions with live data during calls. Free to start.",
};

const FEATURES = [
  {
    icon: Plug,
    title: "Connect your tools, get live answers",
    description:
      "Hook up Slack, Linear, GitHub, or your CRM. During the call, ask Vernix to look up a customer, check sprint status, or pull a report. Real data, no tab-switching.",
  },
  {
    icon: Mic,
    title: "A voice agent that answers and acts",
    description:
      'Say "Vernix, what\'s the status of the Q3 launch?" and get an answer from your connected tools. It listens, understands context, and responds live.',
  },
  {
    icon: FileText,
    title: "Summaries that write themselves",
    description:
      "Walk out of every call with a summary, key decisions, and action items — without writing a single note.",
  },
  {
    icon: BookOpen,
    title: "Bring your own context",
    description:
      "Upload product docs, specs, or past reports. The agent uses them alongside your transcripts to give answers grounded in your actual data.",
  },
  {
    icon: Search,
    title: "Search across every call",
    description:
      '"Who mentioned the Q3 deadline?" Find what was said, when it was said, and who said it — across all your calls at once.',
  },
  {
    icon: VolumeX,
    title: "Silent when you need it",
    description:
      "Prefer text? Silent mode monitors the call and responds via call chat. No audio, no disruption — just answers when you need them.",
  },
  {
    icon: ListChecks,
    title: "Action items, tracked",
    description:
      "Tasks are pulled directly from conversations and tracked per call. No more digging through notes to find who committed to what.",
  },
  {
    icon: MessageSquare,
    title: "Ask your calls anything",
    description:
      "Chat with your call history after the call. Ask follow-up questions, search for decisions, or revisit what was discussed weeks ago.",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Paste your call link",
    description:
      "Drop a Zoom, Meet, Teams, or Webex link. Add an agenda or upload docs if you want — takes 10 seconds.",
  },
  {
    step: "2",
    title: "Vernix joins as a participant",
    description:
      "The agent enters your call, starts transcribing, and listens for questions. You run the call as usual.",
  },
  {
    step: "3",
    title: "Walk away with everything",
    description:
      "Summary, action items, and full transcript land in your dashboard immediately. Search, chat, or export as PDF.",
  },
];

const PAIN_POINTS = [
  "Switching tabs to look up a number while everyone waits",
  "Writing call notes while trying to pay attention",
  "Searching Slack for something someone definitely said on a call",
  "Spending 20 minutes after every call writing a recap no one reads",
];

const PLATFORMS = ["Zoom", "Google Meet", "Microsoft Teams", "Webex"];

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://vernix.app";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "Vernix",
      url: BASE_URL,
      logo: `${BASE_URL}/brand/icon/icon.svg`,
      description:
        "AI meeting assistant that joins video calls, connects to your tools, and answers questions with live business data.",
    },
    {
      "@type": "SoftwareApplication",
      name: "Vernix",
      url: BASE_URL,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "An AI agent that joins Zoom, Meet, Teams, and Webex. Connects to Slack, Linear, GitHub. Answers questions with live data during calls.",
      offers: [
        {
          "@type": "Offer",
          price: "0",
          priceCurrency: "EUR",
          name: "Free",
          description: `${LIMITS[PLANS.FREE].meetingsPerMonth} silent meetings per month, transcription, summaries, and action items.`,
        },
        {
          "@type": "Offer",
          price: String(PRICING[PLANS.PRO].monthly),
          priceCurrency: "EUR",
          name: "Pro",
          description:
            "Voice agent, tool integrations, unlimited meetings, and usage credit.",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: String(PRICING[PLANS.PRO].monthly),
            priceCurrency: "EUR",
            billingDuration: "P1M",
          },
        },
      ],
    },
  ],
};

export default async function LandingPage() {
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const ctaHref = isLoggedIn ? "/dashboard" : "/register";
  const ctaText = isLoggedIn ? "Go to Dashboard" : "Try Vernix Free";
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Hero */}
      <section className="relative mx-auto max-w-3xl px-4 py-24 text-center">
        <HeroBg />
        <div className="animate-fade-up mb-8 flex justify-center">
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
        <h1 className="animate-fade-up mb-4 text-4xl font-bold tracking-tight delay-100 sm:text-5xl">
          An AI assistant in every call that knows your business
        </h1>
        <p className="animate-fade-up text-muted-foreground mx-auto mb-8 max-w-xl text-lg delay-200">
          Vernix joins your video calls, connects to your tools, and answers
          questions with real data. Transcripts, summaries, and action items
          happen automatically.
        </p>
        <div className="animate-fade-up flex flex-col justify-center gap-3 delay-300 sm:flex-row">
          <Button variant="accent" size="lg" render={<Link href={ctaHref} />}>
            {ctaText}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
          <Button variant="outline" size="lg" render={<a href="#how" />}>
            See How It Works
          </Button>
        </div>
        <p className="animate-fade-up text-muted-foreground mt-4 text-xs delay-300">
          No credit card required. Free forever, upgrade anytime.
        </p>
        <div className="animate-fade-up text-muted-foreground mt-8 flex flex-wrap items-center justify-center gap-x-1 text-sm delay-400">
          <Video className="mr-1 h-4 w-4" />
          {PLATFORMS.map((p, i) => (
            <span key={p}>
              {p}
              {i < PLATFORMS.length - 1 && (
                <span className="mx-1 opacity-30">/</span>
              )}
            </span>
          ))}
        </div>
      </section>

      {/* Pain points */}
      <section className="border-border border-t py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="mb-8 text-2xl font-bold">Sound familiar?</h2>
          <ul className="space-y-3">
            {PAIN_POINTS.map((point) => (
              <li
                key={point}
                className="text-muted-foreground text-base italic"
              >
                &ldquo;{point}&rdquo;
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm font-medium">
            Vernix handles all of this. You just show up and talk.
          </p>
        </div>
      </section>

      {/* Features — first row (core) */}
      <section id="features" className="border-border border-t py-24">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-4 text-center text-2xl font-bold">
            Everything that happens after &ldquo;let&rsquo;s hop on a
            call&rdquo;
          </h2>
          <p className="text-muted-foreground mx-auto mb-12 max-w-xl text-center">
            Transcription, summaries, action items, a voice agent, document
            search, and tool integrations — in one place.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.slice(0, 4).map((feature, i) => (
              <ScrollReveal key={feature.title} delay={i * 75}>
                <Card className="h-full">
                  <CardContent className="pt-6">
                    <feature.icon className="text-muted-foreground mb-3 h-8 w-8" />
                    <h3 className="mb-1 font-medium">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>

          {/* Second row with visual break */}
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.slice(4).map((feature, i) => (
              <ScrollReveal key={feature.title} delay={i * 75}>
                <Card className="h-full">
                  <CardContent className="pt-6">
                    <feature.icon className="text-muted-foreground mb-3 h-8 w-8" />
                    <h3 className="mb-1 font-medium">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>

          {/* Mid-page CTA */}
          <div className="mt-12 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button
              variant="accent"
              size="lg"
              render={<Link href="/register" />}
            >
              Try Vernix Free
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              render={<Link href="/pricing" />}
            >
              See Pricing
            </Button>
          </div>
        </div>
      </section>

      {/* Integration Cloud */}
      <section className="border-border border-t py-24">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="mb-4 text-center text-2xl font-bold">
            Connect your tools. Ask during calls.
          </h2>
          <p className="text-muted-foreground mx-auto mb-12 max-w-md text-center">
            Vernix connects to the tools your team already uses. Ask questions
            and get live answers without leaving the call.
          </p>
          <IntegrationCloud />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-border border-t py-24">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="mb-4 text-center text-2xl font-bold">
            Three steps. Under a minute.
          </h2>
          <p className="text-muted-foreground mx-auto mb-12 max-w-md text-center">
            No integrations to configure, no browser extensions to install.
          </p>
          <div className="grid gap-8 sm:grid-cols-3">
            {STEPS.map((item, i) => (
              <ScrollReveal key={item.step} delay={i * 100}>
                <div className="text-center">
                  <div className="bg-ring mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white">
                    {item.step}
                  </div>
                  <h3 className="mb-2 font-medium">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">
                    {item.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — Loss aversion + Regret aversion + Present bias */}
      <section className="bg-ring/10 border-border border-t border-b py-24">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="mb-4 text-2xl font-bold">
            Your next call could be the first one you never have to summarize.
          </h2>
          <p className="text-muted-foreground mb-8">
            No credit card required. {DISPLAY.trialDays}-day Pro trial when you
            upgrade.
          </p>
          <Button size="lg" variant="accent" render={<Link href={ctaHref} />}>
            {isLoggedIn ? "Go to Dashboard" : "Try Vernix on Your Next Call"}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
          <p className="text-muted-foreground mt-4 text-xs">
            Set up in under 60 seconds. Your data stays after the trial.
          </p>
        </div>
      </section>
    </>
  );
}
