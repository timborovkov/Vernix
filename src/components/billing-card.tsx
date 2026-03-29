"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import { PLANS, MONTHLY_CREDIT, PRICING } from "@/lib/billing/constants";
import { getCheckoutUrl } from "@/lib/billing/checkout-url";
import type { BillingData } from "@/hooks/use-billing";

function UsageBar({
  label,
  used,
  limit,
  unit,
}: {
  label: string;
  used: number;
  limit: number | null;
  unit: string;
}) {
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {Math.round(used)} {limit !== null ? `/ ${limit}` : ""} {unit}
        </span>
      </div>
      {limit !== null && (
        <div className="bg-muted h-1.5 overflow-hidden rounded-full">
          <div
            className={`h-full rounded-full transition-all ${
              pct >= 90
                ? "bg-destructive"
                : pct >= 75
                  ? "bg-amber-500"
                  : "bg-ring"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

interface BillingCardProps {
  billing: BillingData | undefined;
  loading: boolean;
}

export function BillingCard({ billing, loading }: BillingCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-4 w-4" />
            Plan & Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="bg-muted h-8 w-48 animate-pulse rounded-md" />
            <div className="bg-muted h-4 w-64 animate-pulse rounded-md" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!billing) return null;

  const isPro = billing.plan === PLANS.PRO;
  const creditUsedPct =
    isPro && billing.usage.creditEur > 0
      ? Math.min(
          100,
          (billing.usage.totalCostEur / billing.usage.creditEur) * 100
        )
      : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-4 w-4" />
            Plan & Usage
          </CardTitle>
          <div className="flex items-center gap-2">
            {billing.trialing ? (
              <Badge variant="default">
                Pro Trial: {billing.trialDaysRemaining}d left
              </Badge>
            ) : (
              <Badge variant={isPro ? "default" : "outline"}>
                {isPro ? "Pro" : "Free"}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Credit usage (Pro only) */}
        {isPro && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                Monthly credit usage
              </span>
              <span className="font-medium">
                €{billing.usage.totalCostEur.toFixed(2)} / €
                {MONTHLY_CREDIT[PLANS.PRO]}
              </span>
            </div>
            <div className="bg-muted h-2 overflow-hidden rounded-full">
              <div
                className={`h-full rounded-full transition-all ${
                  creditUsedPct >= 100
                    ? "bg-destructive"
                    : creditUsedPct >= 80
                      ? "bg-amber-500"
                      : "bg-ring"
                }`}
                style={{ width: `${Math.min(100, creditUsedPct)}%` }}
              />
            </div>
            {billing.usage.overageEur > 0 && (
              <p className="text-destructive text-xs">
                €{billing.usage.overageEur.toFixed(2)} overage this period
              </p>
            )}
          </div>
        )}

        {/* Meeting usage */}
        <div className="space-y-3">
          <UsageBar
            label="Meeting minutes"
            used={billing.usage.voiceMinutes + billing.usage.silentMinutes}
            limit={billing.limits.meetingMinutesPerMonth}
            unit="min"
          />
          {!billing.limits.voiceEnabled && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Voice agent</span>
              <span className="text-muted-foreground">Pro only</span>
            </div>
          )}
          <UsageBar
            label="RAG queries today"
            used={billing.usage.ragQueries}
            limit={billing.limits.ragQueriesPerDay}
            unit=""
          />
          {billing.limits.apiEnabled && (
            <UsageBar
              label="API requests today"
              used={billing.usage.apiRequests}
              limit={billing.limits.apiRequestsPerDay}
              unit=""
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          {!isPro && !billing.trialing && (
            <Button
              size="sm"
              variant="accent"
              onClick={() => {
                window.location.href = getCheckoutUrl();
              }}
            >
              Upgrade to Pro — €{PRICING[PLANS.PRO].monthly}/mo
            </Button>
          )}
          {billing.hasPolarCustomer && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                window.location.href = "/api/portal";
              }}
            >
              Manage Subscription
            </Button>
          )}
        </div>

        {/* Annual savings prompt for monthly Pro users */}
        {isPro &&
          billing.hasPolarCustomer &&
          (() => {
            const periodMs =
              new Date(billing.period.end).getTime() -
              new Date(billing.period.start).getTime();
            const isMonthly = periodMs < 45 * 24 * 60 * 60 * 1000;
            if (!isMonthly) return null;
            return (
              <div className="bg-muted/50 flex items-center justify-between rounded-lg px-3 py-2">
                <p className="text-muted-foreground text-xs">
                  Switch to annual and save €
                  {PRICING[PLANS.PRO].monthly * 12 - PRICING[PLANS.PRO].annual}
                  /year
                </p>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    window.location.href = "/api/portal";
                  }}
                >
                  Switch
                </Button>
              </div>
            );
          })()}

        {/* Period info */}
        <p className="text-muted-foreground text-xs">
          Billing period: {new Date(billing.period.start).toLocaleDateString()}{" "}
          — {new Date(billing.period.end).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}
