"use client";

import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  BookOpen,
  Settings,
  Download,
  Zap,
  Clock,
  Plug,
} from "lucide-react";
import { useBilling } from "@/hooks/use-billing";
import { PLANS, PRICING } from "@/lib/billing/constants";
import { getCheckoutUrl } from "@/lib/billing/checkout-url";

function PlanBanner() {
  const { billing, loading } = useBilling();

  if (loading || !billing) return null;

  const isPro = billing.plan === PLANS.PRO;

  // Pro users don't need a banner (non-trialing)
  if (isPro) return null;

  const checkoutUrl = getCheckoutUrl();

  // Polar trial active (user subscribed, payment deferred)
  if (billing.trialing && billing.hasSubscription) {
    const totalMin = billing.usage.voiceMinutes + billing.usage.silentMinutes;
    return (
      <div className="bg-ring/10 border-ring/20 border-b px-4 py-1.5">
        <div className="container mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <Clock className="h-3.5 w-3.5" />
            <span>
              Pro trial: <strong>{billing.trialDaysRemaining}d left</strong>,{" "}
              {Math.round(totalMin)} of 90 min used
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Trial expired or free plan
  const meetingsUsed = billing.usage.voiceMinutes + billing.usage.silentMinutes;
  const meetingLimit = billing.limits.meetingMinutesPerMonth;

  return (
    <div className="bg-muted/50 border-b px-4 py-1.5">
      <div className="container mx-auto flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">
            Free plan: {Math.round(meetingsUsed)}
            {meetingLimit !== null ? ` of ${meetingLimit}` : ""} min used
            {billing.trialDaysRemaining === 0 &&
              billing.trialEndsAt &&
              " (trial ended)"}
          </span>
        </div>
        <Button
          size="xs"
          variant="accent"
          onClick={() => {
            window.location.href = checkoutUrl;
          }}
        >
          <Zap className="mr-1 h-3 w-3" />
          Upgrade — €{PRICING[PLANS.PRO].monthly}/mo
        </Button>
      </div>
    </div>
  );
}

export function DashboardHeader() {
  return (
    <header className="border-border bg-background/80 sticky top-0 z-50 border-b backdrop-blur-sm">
      <div className="container mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/dashboard">
          <Image
            src="/brand/combo/horizontal-nobg.png"
            alt="Vernix"
            width={120}
            height={32}
            className="dark:hidden"
          />
          <Image
            src="/brand/combo/horizontal-dark-nobg.png"
            alt="Vernix"
            width={120}
            height={32}
            className="hidden dark:block"
          />
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/dashboard/integrations" />}
          >
            <Plug className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">Integrations</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/dashboard/knowledge" />}
          >
            <BookOpen className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">Knowledge</span>
          </Button>
          <Button variant="outline" size="sm" render={<a href="/api/export" />}>
            <Download className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/dashboard/settings" />}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <PlanBanner />
    </header>
  );
}
