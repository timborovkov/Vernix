import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing — Vernix",
};

const TIERS = [
  {
    name: "Free Trial",
    price: "$0",
    period: "to get started",
    features: [
      "5 meetings",
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
      <h1 className="mb-4 text-center text-3xl font-bold">Pricing</h1>
      <p className="text-muted-foreground mx-auto mb-12 max-w-lg text-center">
        Simple, transparent pricing. Start free and upgrade as you grow.
      </p>

      <div className="grid gap-6 sm:grid-cols-3">
        {TIERS.map((tier) => (
          <Card
            key={tier.name}
            className={tier.highlighted ? "ring-primary ring-2" : ""}
          >
            <CardHeader>
              <CardTitle className="text-lg">{tier.name}</CardTitle>
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
                variant={tier.highlighted ? "default" : "outline"}
                render={<Link href="/register" />}
              >
                {tier.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
