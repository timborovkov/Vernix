import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollReveal } from "@/components/scroll-reveal";
import { HeroBg } from "@/components/hero-bg";
import {
  Search,
  ArrowRight,
  Mic,
  FileText,
  ListChecks,
  Plug,
} from "lucide-react";
import { LIMITS, PLANS } from "@/lib/billing/constants";

export const metadata: Metadata = {
  title: "AI Call Transcription and Search | Vernix",
  description:
    "Automatic transcription, summaries, and action items for every call. Search across all your calls to find who said what, when. Free to start.",
};

const USE_CASES = [
  {
    scenario:
      'Your manager asks "Didn\'t we already decide on the Q3 timeline?"',
    before:
      "Scroll through Slack, check Google Docs, dig through email. Maybe find it, maybe not.",
    after:
      'Search "Q3 timeline" and find exactly who said what, when, with a link to the full transcript.',
  },
  {
    scenario: "A new team member needs context on a project they just joined.",
    before:
      "Schedule a 30-minute catch-up call. Repeat everything that was already discussed.",
    after:
      "Share the call search. They read the summaries, decisions, and action items on their own time.",
  },
  {
    scenario: "You need to remember who committed to what last week.",
    before:
      "Check your notes (if you took any). Ask around. Piece it together from memory.",
    after:
      "Open the call, see the auto-extracted action items with assignees. Done.",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Paste your call link",
    description:
      "Zoom, Meet, Teams, or Webex. Vernix joins as a participant and starts transcribing.",
  },
  {
    step: "2",
    title: "Call runs as normal",
    description:
      "Every word is captured with speaker identification. You focus on the conversation.",
  },
  {
    step: "3",
    title: "Everything lands in your dashboard",
    description:
      "Summary, action items, and full transcript. Searchable across all your calls.",
  },
];

export default function MeetingMemoryPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 lg:pb-32">
      {/* Hero */}
      <div className="relative mb-24 py-24 text-center lg:mb-28">
        <HeroBg />
        <div className="relative z-10">
          <div className="bg-ring/10 mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-full">
            <Search className="text-ring h-8 w-8" />
          </div>
          <h1 className="mx-auto mb-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Your in-call AI assistant with perfect call memory.
          </h1>
          <p className="text-muted-foreground mx-auto mb-10 max-w-2xl text-lg leading-relaxed">
            During the call and after it ends, Vernix captures every decision,
            summarizes key points, and tracks action items automatically.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button
              variant="accent"
              size="lg"
              render={<Link href="/register" />}
            >
              Start free
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              render={<Link href="/pricing" />}
            >
              See pricing
            </Button>
          </div>
          <p className="text-muted-foreground mt-4 text-xs leading-relaxed">
            Free plan includes {LIMITS[PLANS.FREE].meetingsPerMonth} calls per
            month. No credit card.
          </p>
        </div>
      </div>

      {/* Use cases */}
      <ScrollReveal>
        <div className="mb-24 lg:mb-28">
          <h2 className="mb-10 text-center text-2xl font-bold sm:text-3xl">
            Sound familiar?
          </h2>
          <div className="space-y-8">
            {USE_CASES.map((uc) => (
              <Card key={uc.scenario}>
                <CardContent className="p-8">
                  <p className="mb-5 text-base font-semibold">{uc.scenario}</p>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                        Without Vernix
                      </p>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {uc.before}
                      </p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium text-green-600 uppercase">
                        With Vernix
                      </p>
                      <p className="text-sm leading-relaxed">{uc.after}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </ScrollReveal>

      {/* How it works */}
      <ScrollReveal>
        <div className="mb-24 lg:mb-28">
          <h2 className="mb-10 text-center text-2xl font-bold sm:text-3xl">
            How it works
          </h2>
          <div className="grid gap-10 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.step} className="mx-auto max-w-xs text-center">
                <div className="bg-ring text-ring-foreground mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold">
                  {s.step}
                </div>
                <h3 className="mb-2 text-base font-semibold">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>

      {/* What you get */}
      <ScrollReveal>
        <div className="mb-24 lg:mb-28">
          <h2 className="mb-8 text-center text-2xl font-bold sm:text-3xl">
            What every call gives you
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Card>
              <CardContent className="flex items-start gap-4 p-5">
                <FileText className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    Summary and key decisions
                  </p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    AI-generated summary with the important points, not a wall
                    of text.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-start gap-4 p-5">
                <ListChecks className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    Action items with assignees
                  </p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Tasks pulled from the conversation. No more &quot;who was
                    going to do that?&quot;
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-start gap-4 p-5">
                <Mic className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    Full transcript with speakers
                  </p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Every word, identified by speaker. Searchable immediately.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-start gap-4 p-5">
                <Search className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Cross-call search</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Find what was said across all your calls at once. Semantic
                    search, not just keyword matching.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </ScrollReveal>

      {/* Upgrade nudge */}
      <ScrollReveal>
        <div className="bg-muted/30 mb-24 rounded-xl p-8 text-center lg:mb-28">
          <Plug className="text-muted-foreground mx-auto mb-4 h-6 w-6" />
          <p className="mb-2 text-sm font-medium">Want more than memory?</p>
          <p className="text-muted-foreground mx-auto mb-5 max-w-xl text-xs leading-relaxed">
            Pro users connect tools like Slack, Linear, and GitHub. The agent
            answers with live data during calls.
          </p>
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/features/integrations" />}
          >
            Learn about integrations
          </Button>
        </div>
      </ScrollReveal>

      {/* Bottom CTA */}
      <div className="pb-2 text-center">
        <h2 className="mb-4 text-2xl font-bold sm:text-3xl">
          Never forget a call again
        </h2>
        <p className="text-muted-foreground mx-auto mb-8 max-w-xl text-sm leading-relaxed">
          Start free. No credit card required.
        </p>
        <Button variant="accent" size="lg" render={<Link href="/register" />}>
          Get started free
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
