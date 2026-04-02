"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ArrowRight } from "lucide-react";
import { getCheckoutUrl } from "@/lib/billing/checkout-url";
import { DISPLAY, LIMITS, PLANS } from "@/lib/billing/constants";
import { trackPricingPageViewed } from "@/lib/analytics";

const FREE_FEATURES = [
  `${LIMITS[PLANS.FREE].voiceMeetingsPerMonth} voice meeting per month`,
  `${LIMITS[PLANS.FREE].meetingMinutesPerMonth} minutes of calls per month`,
  "Live transcription",
  "AI summaries and action items",
  `RAG chat (${LIMITS[PLANS.FREE].ragQueriesPerDay} queries/day)`,
  `${LIMITS[PLANS.FREE].documentsCount} knowledge base documents`,
  `${LIMITS[PLANS.FREE].mcpServerConnections} tool integration`,
];

const PRO_FEATURES = [
  "Voice agent",
  "Silent agent",
  `${DISPLAY.monthlyCredit} usage credit included monthly`,
  "Pay-as-you-go beyond credits",
  `${LIMITS[PLANS.PRO].documentsCount} knowledge base documents`,
  `API access (${LIMITS[PLANS.PRO].apiRequestsPerDay.toLocaleString("en")} requests/day)`,
  "MCP server and client connections",
  "Cross-call search",
  "Call export (PDF and Markdown)",
  `Up to ${LIMITS[PLANS.PRO].concurrentMeetings} concurrent calls`,
];

const USAGE_RATE_ROWS = [
  { type: "Voice call", price: DISPLAY.voiceRate },
  { type: "Silent call", price: DISPLAY.silentRate },
  { type: "Post-call chat", price: "Free" },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    trackPricingPageViewed();
  }, []);

  const price = annual ? DISPLAY.proAnnual : DISPLAY.proMonthly;
  const period = annual ? "/ mo, billed annually" : "/ month";
  const savings = annual ? `Save ${DISPLAY.annualSavings}/year` : null;

  const checkoutUrl = session?.user
    ? getCheckoutUrl(annual ? "annual" : "monthly")
    : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-24">
      <h1 className="mb-4 text-center text-3xl font-bold">
        One plan. Pay for what you use.
      </h1>
      <p className="text-muted-foreground mx-auto mb-8 max-w-lg text-center">
        Start free with silent calls. Pro includes {DISPLAY.monthlyCredit} of
        usage credit — most users never go over.
      </p>

      {/* Billing toggle */}
      <div className="mb-12 flex flex-col items-center">
        <div className="flex items-center justify-center gap-3">
          <span
            className={`text-sm ${!annual ? "text-foreground font-medium" : "text-muted-foreground"}`}
          >
            Monthly
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={annual}
            onClick={() => setAnnual(!annual)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              annual ? "bg-ring" : "bg-muted"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                annual ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <span
            className={`text-sm ${annual ? "text-foreground font-medium" : "text-muted-foreground"}`}
          >
            Annual
          </span>
        </div>
        <div className="mt-2 h-6">
          {savings && <Badge variant="secondary">{savings}</Badge>}
        </div>
      </div>

      <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
        {/* Free */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Free</CardTitle>
            <div className="mt-2">
              <span className="text-3xl font-bold">€0</span>
              <span className="text-muted-foreground ml-1 text-sm">
                forever
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              Silent call agent. No credit card needed.
            </p>
          </CardHeader>
          <CardContent>
            <ul className="mb-6 space-y-2">
              {FREE_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="text-muted-foreground h-4 w-4 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              className="w-full"
              variant="outline"
              render={<Link href="/register" />}
            >
              Get Started Free
            </Button>
          </CardContent>
        </Card>

        {/* Pro */}
        <Card className="ring-ring ring-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Pro</CardTitle>
              <Badge variant="secondary">
                {DISPLAY.trialDays}-day free trial
              </Badge>
            </div>
            <div className="mt-2">
              <span className="text-3xl font-bold">{price}</span>
              <span className="text-muted-foreground ml-1 text-sm">
                {period}
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              Everything. Voice agent, API, MCP. {DISPLAY.monthlyCredit} credit
              included.
            </p>
          </CardHeader>
          <CardContent>
            <ul className="mb-6 space-y-2">
              {PRO_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="text-muted-foreground h-4 w-4 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              className="w-full"
              variant="accent"
              render={
                <Link
                  href={session && checkoutUrl ? checkoutUrl : "/register"}
                />
              }
            >
              {session
                ? "Upgrade to Pro"
                : `Start ${DISPLAY.trialDays}-Day Free Trial`}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
            <p className="text-muted-foreground mt-3 text-center text-xs">
              Cancel anytime.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Usage rates */}
      <div className="mx-auto mt-16 max-w-2xl">
        <h2 className="mb-2 text-center text-xl font-bold">
          Usage-based. Predictable.
        </h2>
        <p className="text-muted-foreground mx-auto mb-6 max-w-md text-center text-sm">
          Credits cover your calls. Most users stay within the{" "}
          {DISPLAY.monthlyCredit} credit and pay a flat{" "}
          {annual ? DISPLAY.proAnnual : DISPLAY.proMonthly}/mo. If you go over,
          you only pay for what you use.
        </p>
        <div className="border-border divide-border divide-y rounded-lg border">
          {USAGE_RATE_ROWS.map((rate) => (
            <div
              key={rate.type}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              <span>{rate.type}</span>
              <span className="font-medium">{rate.price}</span>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground mt-3 text-center text-xs">
          Set a monthly spending cap to avoid surprises. Credits don&apos;t roll
          over.
        </p>
      </div>

      {/* Bottom note */}
      <p className="text-muted-foreground mx-auto mt-12 max-w-md text-center text-sm">
        All plans include transcription, summaries, and action items. No
        long-term contracts. Your data stays if you downgrade.
      </p>
    </div>
  );
}
