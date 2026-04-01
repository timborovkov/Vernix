import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollReveal } from "@/components/scroll-reveal";
import { IntegrationCloud } from "@/components/integration-cloud";
import { HeroBg } from "@/components/hero-bg";
import { Plug, ArrowRight } from "lucide-react";
import { DISPLAY } from "@/lib/billing/constants";
import { getIntegrations, CATEGORIES } from "@/lib/integrations/catalog";

export const metadata: Metadata = {
  title: "Connect Your Tools to Video Calls | Vernix Integrations",
  description:
    "Stop switching tabs during calls. Connect Slack, Linear, GitHub, or your CRM. Ask Vernix and get live answers during the call.",
};

const USE_CASES = [
  {
    scenario: "Your PM asks for sprint status during standup.",
    before:
      "Open Linear, share screen, scroll through boards, lose 2 minutes of everyone's time.",
    after:
      '"Vernix, what\'s left in the current sprint?" The agent checks Linear and answers in 3 seconds. Call keeps moving.',
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
    title: "Start a call",
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
    <div className="mx-auto max-w-5xl px-4 pb-28 lg:pb-32">
      {/* Hero */}
      <div className="relative mb-24 py-24 text-center lg:mb-28">
        <HeroBg />
        <div className="relative z-10">
          <div className="bg-ring/10 mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-full">
            <Plug className="text-ring h-8 w-8" />
          </div>
          <h1 className="mx-auto mb-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Stop switching tabs. Ask your in-call AI assistant for every tool.
          </h1>
          <p className="text-muted-foreground mx-auto mb-10 max-w-2xl text-lg leading-relaxed">
            Connect Slack, Linear, GitHub, or your CRM. Ask Vernix during the
            call and get real answers in seconds.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button
              variant="accent"
              size="lg"
              render={<Link href="/register" />}
            >
              Try free for {DISPLAY.trialDays} days
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
        </div>
      </div>

      {/* Use cases */}
      <ScrollReveal>
        <div className="mb-24 lg:mb-28">
          <h2 className="mb-10 text-center text-2xl font-bold sm:text-3xl">
            What it looks like in practice
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

      {/* Integration Cloud */}
      <ScrollReveal>
        <div className="mb-24 lg:mb-28">
          <h2 className="mb-8 text-center text-2xl font-bold sm:text-3xl">
            Tools you can connect
          </h2>
          <IntegrationCloud showCta={false} />
        </div>
      </ScrollReveal>

      {/* Full integration catalog */}
      <ScrollReveal>
        <div className="mb-24 lg:mb-28">
          <h2 className="mb-4 text-center text-2xl font-bold sm:text-3xl">
            Browse all integrations
          </h2>
          <p className="text-muted-foreground mx-auto mb-12 max-w-xl text-center text-sm leading-relaxed">
            Connect any of these tools and query them live during your calls.
          </p>
          <div className="space-y-12">
            {CATEGORIES.map((category) => {
              const items = getIntegrations().filter(
                (i) => i.category === category.value
              );
              if (items.length === 0) return null;
              return (
                <div key={category.value}>
                  <h3 className="text-muted-foreground mb-4 text-sm font-semibold tracking-wide uppercase">
                    {category.label}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {items.map((integration) => (
                      <Link
                        key={integration.id}
                        href={`/integration/${integration.id}`}
                        className="border-border hover:border-ring/40 hover:bg-muted/50 flex items-center gap-4 rounded-lg border p-4 transition-colors"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                          <Image
                            src={integration.logo}
                            alt={integration.name}
                            width={20}
                            height={20}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {integration.name}
                            </span>
                            {integration.status === "coming-soon" && (
                              <Badge variant="secondary" className="text-xs">
                                Coming soon
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground truncate text-xs">
                            {integration.description}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </ScrollReveal>

      {/* Bottom CTA */}
      <div className="pb-2 text-center">
        <h2 className="mb-4 text-2xl font-bold sm:text-3xl">
          Ready to stop switching tabs?
        </h2>
        <p className="text-muted-foreground mx-auto mb-8 max-w-xl text-sm leading-relaxed">
          {DISPLAY.trialDays}-day free trial. No charge until the trial ends.
        </p>
        <Button variant="accent" size="lg" render={<Link href="/register" />}>
          Get started free
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
