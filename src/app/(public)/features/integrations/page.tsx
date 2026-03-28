import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollReveal } from "@/components/scroll-reveal";
import {
  Plug,
  ArrowRight,
  Mic,
  Search,
  FileText,
  MessageSquare,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Connect Your Tools to Video Calls | Vernix Integrations",
  description:
    "Stop switching tabs during meetings. Connect Slack, Linear, GitHub, or your CRM. Ask Vernix and get live answers during the call.",
};

const USE_CASES = [
  {
    scenario: "Your PM asks for sprint status during standup.",
    before:
      "Open Linear, share screen, scroll through boards, lose 2 minutes of everyone's time.",
    after:
      '"Vernix, what\'s left in the current sprint?" The agent checks Linear and answers in 3 seconds. Meeting keeps moving.',
  },
  {
    scenario: "A client asks about their support ticket.",
    before:
      "Scramble to open the CRM, search for the customer, find the ticket, read it out loud.",
    after:
      "\"Vernix, what's the status of Acme Corp's open ticket?\" Instant answer with details, no tab switching.",
  },
  {
    scenario: "Engineering debate about a recent deployment.",
    before:
      "Someone shares their screen, opens GitHub, finds the PR, reads the description.",
    after:
      '"Vernix, what changed in the last deploy?" The agent pulls the commit history and summarizes it.',
  },
];

const STEPS = [
  {
    step: "1",
    title: "Connect your tools",
    description:
      "Add integrations from Settings. Supports any MCP-compatible server: Slack, Linear, GitHub, CRM systems, and more.",
  },
  {
    step: "2",
    title: "Start a meeting",
    description:
      "Paste a Zoom, Meet, Teams, or Webex link. Vernix joins and connects to your tools automatically.",
  },
  {
    step: "3",
    title: "Ask during the call",
    description:
      'Say "Vernix, check our sprint board" or "Look up this customer." The agent pulls live data and responds.',
  },
];

export default function IntegrationsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-24">
      {/* Hero */}
      <div className="mb-20 text-center">
        <div className="bg-ring/10 mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full">
          <Plug className="text-ring h-8 w-8" />
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Stop switching tabs. Ask Vernix.
        </h1>
        <p className="text-muted-foreground mx-auto mb-8 max-w-xl text-lg">
          Connect Slack, Linear, GitHub, or your CRM. Get real answers during
          calls, not after.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button variant="accent" size="lg" render={<Link href="/register" />}>
            Try free for 14 days
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
          <Button variant="outline" size="lg" render={<Link href="/pricing" />}>
            See pricing
          </Button>
        </div>
      </div>

      {/* Use cases */}
      <ScrollReveal>
        <div className="mb-20">
          <h2 className="mb-8 text-center text-2xl font-bold">
            What it looks like in practice
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

      {/* Plus section */}
      <ScrollReveal>
        <div className="mb-20">
          <h2 className="mb-6 text-center text-2xl font-bold">
            Plus, everything else
          </h2>
          <div className="text-muted-foreground mx-auto grid max-w-lg gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4 shrink-0" />
              Voice agent answers live
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 shrink-0" />
              Automatic summaries and tasks
            </div>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 shrink-0" />
              Cross-meeting search
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 shrink-0" />
              200 AI queries per day
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Bottom CTA */}
      <div className="text-center">
        <h2 className="mb-3 text-2xl font-bold">
          Ready to stop switching tabs?
        </h2>
        <p className="text-muted-foreground mb-6 text-sm">
          14-day free trial. No charge until the trial ends.
        </p>
        <Button variant="accent" size="lg" render={<Link href="/register" />}>
          Get started free
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
