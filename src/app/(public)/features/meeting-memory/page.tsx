import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollReveal } from "@/components/scroll-reveal";
import {
  Search,
  ArrowRight,
  Mic,
  FileText,
  ListChecks,
  Plug,
} from "lucide-react";

export const metadata: Metadata = {
  title: "AI Meeting Transcription and Search | Vernix",
  description:
    "Automatic transcription, summaries, and action items for every call. Search across all your meetings to find who said what, when. Free to start.",
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
      "Share the meeting search. They read the summaries, decisions, and action items on their own time.",
  },
  {
    scenario: "You need to remember who committed to what last week.",
    before:
      "Check your notes (if you took any). Ask around. Piece it together from memory.",
    after:
      "Open the meeting, see the auto-extracted action items with assignees. Done.",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Paste your meeting link",
    description:
      "Zoom, Meet, Teams, or Webex. Vernix joins as a participant and starts transcribing.",
  },
  {
    step: "2",
    title: "Meeting runs as normal",
    description:
      "Every word is captured with speaker identification. You focus on the conversation.",
  },
  {
    step: "3",
    title: "Everything lands in your dashboard",
    description:
      "Summary, action items, and full transcript. Searchable across all your meetings.",
  },
];

export default function MeetingMemoryPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-24">
      {/* Hero */}
      <div className="mb-20 text-center">
        <div className="bg-ring/10 mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full">
          <Search className="text-ring h-8 w-8" />
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Find what was said. In any meeting. In seconds.
        </h1>
        <p className="text-muted-foreground mx-auto mb-8 max-w-xl text-lg">
          Every call transcribed, summarized, and searchable. Action items
          tracked automatically.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button variant="accent" size="lg" render={<Link href="/register" />}>
            Start free
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
          <Button variant="outline" size="lg" render={<Link href="/pricing" />}>
            See pricing
          </Button>
        </div>
        <p className="text-muted-foreground mt-3 text-xs">
          Free plan includes 5 meetings per month. No credit card.
        </p>
      </div>

      {/* Use cases */}
      <ScrollReveal>
        <div className="mb-20">
          <h2 className="mb-8 text-center text-2xl font-bold">
            Sound familiar?
          </h2>
          <div className="space-y-6">
            {USE_CASES.map((uc) => (
              <Card key={uc.scenario}>
                <CardContent className="p-6">
                  <p className="mb-4 text-sm font-semibold">{uc.scenario}</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                        Without Vernix
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {uc.before}
                      </p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium text-green-600 uppercase">
                        With Vernix
                      </p>
                      <p className="text-sm">{uc.after}</p>
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
        <div className="mb-20">
          <h2 className="mb-8 text-center text-2xl font-bold">How it works</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.step} className="text-center">
                <div className="bg-ring text-ring-foreground mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold">
                  {s.step}
                </div>
                <h3 className="mb-1 font-semibold">{s.title}</h3>
                <p className="text-muted-foreground text-sm">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>

      {/* What you get */}
      <ScrollReveal>
        <div className="mb-20">
          <h2 className="mb-6 text-center text-2xl font-bold">
            What every meeting gives you
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardContent className="flex items-start gap-3 p-4">
                <FileText className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    Summary and key decisions
                  </p>
                  <p className="text-muted-foreground text-xs">
                    AI-generated summary with the important points, not a wall
                    of text.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-start gap-3 p-4">
                <ListChecks className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    Action items with assignees
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Tasks pulled from the conversation. No more &quot;who was
                    going to do that?&quot;
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-start gap-3 p-4">
                <Mic className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    Full transcript with speakers
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Every word, identified by speaker. Searchable immediately.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-start gap-3 p-4">
                <Search className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Cross-meeting search</p>
                  <p className="text-muted-foreground text-xs">
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
        <div className="bg-muted/30 mb-20 rounded-xl p-6 text-center">
          <Plug className="text-muted-foreground mx-auto mb-3 h-6 w-6" />
          <p className="mb-1 text-sm font-medium">Want more than memory?</p>
          <p className="text-muted-foreground mb-3 text-xs">
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
      <div className="text-center">
        <h2 className="mb-3 text-2xl font-bold">
          Never forget a meeting again
        </h2>
        <p className="text-muted-foreground mb-6 text-sm">
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
