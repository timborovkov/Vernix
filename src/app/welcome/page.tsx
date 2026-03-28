"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Mic,
  FileText,
  MessageSquare,
  Search,
  Plug,
  Clock,
  ArrowRight,
} from "lucide-react";
import { PRICING, PLANS } from "@/lib/billing/constants";
import { getCheckoutUrl } from "@/lib/billing/checkout-url";

const PRO_FEATURES = [
  { icon: Mic, label: "Voice agent answers questions live on calls" },
  { icon: MessageSquare, label: "200 AI queries per day" },
  { icon: Search, label: "Cross-meeting search" },
  { icon: FileText, label: "200 knowledge base documents" },
  { icon: Plug, label: "API and MCP integrations" },
  { icon: Clock, label: "Unlimited meetings with monthly credit" },
];

export default function WelcomePage() {
  const checkoutUrl = getCheckoutUrl();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="mb-8">
        <Image
          src="/brand/combo/horizontal-nobg.png"
          alt="Vernix"
          width={130}
          height={36}
          className="dark:hidden"
        />
        <Image
          src="/brand/combo/horizontal-dark-nobg.png"
          alt="Vernix"
          width={130}
          height={36}
          className="hidden dark:block"
        />
      </div>

      <div className="w-full max-w-lg">
        <h1 className="mb-2 text-center text-2xl font-bold">
          Welcome to Vernix
        </h1>
        <p className="text-muted-foreground mb-8 text-center text-sm">
          Your account is ready. Try Pro free for 14 days, or start with the
          free plan.
        </p>

        {/* Pro trial card */}
        <Card className="border-ring/30 ring-ring/10 mb-4 ring-1">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Pro Trial</h2>
                <p className="text-muted-foreground text-xs">
                  14 days free, then €{PRICING[PLANS.PRO].monthly}/mo. Cancel
                  anytime.
                </p>
              </div>
              <Badge variant="default">Recommended</Badge>
            </div>

            <ul className="mb-6 space-y-2.5">
              {PRO_FEATURES.map((f) => (
                <li key={f.label} className="flex items-center gap-2.5 text-sm">
                  <f.icon className="text-muted-foreground h-4 w-4 shrink-0" />
                  {f.label}
                </li>
              ))}
            </ul>

            <Button
              variant="accent"
              className="w-full"
              onClick={() => {
                window.location.href = checkoutUrl;
              }}
            >
              Start 14-Day Free Trial
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>

            <p className="text-muted-foreground mt-3 text-center text-xs">
              No charge for 14 days. Cancel before the trial ends and you
              won&apos;t be billed.
            </p>
          </CardContent>
        </Card>

        {/* Free plan option */}
        <div className="text-center">
          <Button
            variant="ghost"
            className="text-muted-foreground"
            render={<Link href="/dashboard" />}
          >
            Continue with Free plan
          </Button>
          <p className="text-muted-foreground mt-1 text-xs">
            5 silent meetings/month, 30 minutes, 20 queries/day
          </p>
        </div>
      </div>
    </div>
  );
}
