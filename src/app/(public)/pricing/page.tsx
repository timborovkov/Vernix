import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing — Vernix",
  description:
    "Simple, transparent pricing for Vernix. Start free with 5 meetings, upgrade to Pro or Unlimited for voice agents, knowledge base, and API access.",
};

const TIERS = [
  {
    name: "Free Trial",
    price: "$0",
    period: "to get started",
    features: [
      "5 meetings total",
      "Live transcription",
      "AI summaries",
      "Action item extraction",
      "Email support",
    ],
    cta: "Start Free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/ month",
    features: [
      "Everything in Free, plus:",
      "Unlimited meetings",
      "Voice agent",
      "Knowledge base uploads",
      "Cross-meeting search",
      "Meeting export (PDF & MD)",
      "Priority support",
    ],
    cta: "Get Pro",
    highlighted: true,
  },
  {
    name: "Unlimited",
    price: "$99",
    period: "/ month",
    features: [
      "Everything in Pro",
      "MCP tool integration",
      "Custom agent prompts",
      "API access",
      "Bulk export",
      "Dedicated support",
    ],
    cta: "Get Unlimited",
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-24">
      <h1 className="mb-4 text-center text-3xl font-bold">
        Pick a plan, try it on your next call
      </h1>
      <p className="text-muted-foreground mx-auto mb-12 max-w-lg text-center">
        Start free with 5 meetings. Upgrade when you&apos;re ready — cancel
        anytime.
      </p>

      <div className="grid gap-6 sm:grid-cols-3">
        {TIERS.map((tier) => (
          <Card
            key={tier.name}
            className={tier.highlighted ? "ring-ring ring-2" : ""}
          >
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{tier.name}</CardTitle>
                {tier.highlighted && (
                  <Badge variant="secondary">Most popular</Badge>
                )}
              </div>
              <div className="mt-2">
                <span className="text-3xl font-bold">{tier.price}</span>
                <span className="text-muted-foreground ml-1 text-sm">
                  {tier.period}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="mb-6 space-y-2">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="text-muted-foreground h-4 w-4 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={tier.highlighted ? "accent" : "outline"}
                render={<Link href="/register" />}
              >
                {tier.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-muted-foreground mx-auto mt-8 max-w-md text-center text-sm">
        All plans include live transcription, AI summaries, and action item
        extraction. No long-term contracts — cancel anytime.
      </p>
    </div>
  );
}
