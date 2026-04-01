"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useBilling } from "@/hooks/use-billing";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Mic,
  FileText,
  MessageSquare,
  Search,
  Plug,
  Clock,
} from "lucide-react";
import { PRICING, PLANS, DISPLAY, LIMITS } from "@/lib/billing/constants";
import { getCheckoutUrl } from "@/lib/billing/checkout-url";

const PRO_FEATURES = [
  {
    icon: Plug,
    label: "Connect tools like Slack, Linear, or CRM for live data in calls",
  },
  { icon: Mic, label: "Voice agent answers and takes action during calls" },
  { icon: Search, label: "Search across all your calls and documents" },
  {
    icon: FileText,
    label: `${LIMITS[PLANS.PRO].documentsCount} knowledge base documents for context`,
  },
  { icon: MessageSquare, label: "AI chat across all your calls" },
  { icon: Clock, label: "Unlimited calls with monthly credit" },
];

export default function WelcomePage() {
  const { billing, loading } = useBilling();
  const router = useRouter();

  // Pro or trialing users don't need the welcome/upgrade page
  useEffect(() => {
    if (!loading && billing) {
      if (
        billing.plan === "pro" ||
        billing.trialing ||
        billing.hasSubscription
      ) {
        router.replace("/dashboard");
      }
    }
  }, [loading, billing, router]);

  if (!loading && billing?.plan === "pro") return null;
  if (!loading && (billing?.trialing || billing?.hasSubscription)) return null;

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
          Your account is ready. Try Pro free for {DISPLAY.trialDays} days, or
          start with the free plan.
        </p>

        {/* Pro trial card */}
        <Card className="border-ring/30 ring-ring/10 mb-4 ring-1">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Start Pro free</h2>
                <p className="text-muted-foreground text-xs">
                  {DISPLAY.trialDays} days free. Cancel anytime before trial
                  ends.
                </p>
              </div>
              <Badge variant="default">Recommended</Badge>
            </div>

            <ul className="mb-5 space-y-2.5">
              {PRO_FEATURES.map((f) => (
                <li key={f.label} className="flex items-center gap-2.5 text-sm">
                  <f.icon className="text-muted-foreground h-4 w-4 shrink-0" />
                  {f.label}
                </li>
              ))}
            </ul>

            <p className="text-muted-foreground mb-3 text-xs font-medium">
              Pick a plan for after the trial:
            </p>
            <div className="mb-4 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  window.location.href = getCheckoutUrl("monthly");
                }}
                className="border-border hover:border-ring flex-1 rounded-lg border p-3 text-left transition-colors"
              >
                <p className="text-sm font-medium">
                  €{PRICING[PLANS.PRO].monthly}/mo
                </p>
                <p className="text-muted-foreground text-xs">Monthly</p>
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = getCheckoutUrl("annual");
                }}
                className="border-ring/50 bg-ring/5 hover:border-ring flex-1 rounded-lg border p-3 text-left transition-colors"
              >
                <p className="text-sm font-medium">
                  €{Math.round(PRICING[PLANS.PRO].annual / 12)}/mo
                </p>
                <p className="text-muted-foreground text-xs">
                  Annual (save €
                  {PRICING[PLANS.PRO].monthly * 12 - PRICING[PLANS.PRO].annual}
                  /yr)
                </p>
              </button>
            </div>

            <p className="text-muted-foreground text-center text-xs">
              No charge for {DISPLAY.trialDays} days. Cancel before the trial
              ends and you won&apos;t be billed.
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
            {LIMITS[PLANS.FREE].meetingsPerMonth} silent calls/month,{" "}
            {LIMITS[PLANS.FREE].meetingMinutesPerMonth} minutes,{" "}
            {LIMITS[PLANS.FREE].ragQueriesPerDay} queries/day
          </p>
        </div>
      </div>
    </div>
  );
}
