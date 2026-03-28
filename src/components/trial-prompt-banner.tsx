"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, X, ArrowRight } from "lucide-react";
import { useBilling } from "@/hooks/use-billing";
import { PLANS } from "@/lib/billing/constants";
import { getCheckoutUrl } from "@/lib/billing/checkout-url";

const STORAGE_KEY = "vernix_trial_prompt";
const SHOW_EVERY_N_VISITS = 3;
const DISMISS_COOLDOWN_DAYS = 7;

interface PromptState {
  visits: number;
  dismissedAt: number | null;
}

function getState(): PromptState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { visits: 0, dismissedAt: null };
}

function setState(state: PromptState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function TrialPromptBanner() {
  const { billing, loading } = useBilling();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loading || !billing) return;

    // Only show for free users without an active subscription
    const isPro = billing.plan === PLANS.PRO;
    const hasSubscription = billing.hasSubscription;
    if (isPro || hasSubscription) return;

    const state = getState();
    const newVisits = state.visits + 1;

    // Check dismiss cooldown
    if (state.dismissedAt) {
      const daysSinceDismiss =
        (Date.now() - state.dismissedAt) / (1000 * 60 * 60 * 24);
      if (daysSinceDismiss < DISMISS_COOLDOWN_DAYS) {
        setState({ ...state, visits: newVisits });
        return;
      }
    }

    // Show every Nth visit
    if (newVisits % SHOW_EVERY_N_VISITS === 0) {
      setVisible(true);
    }

    setState({ ...state, visits: newVisits, dismissedAt: null });
  }, [billing, loading]);

  if (!visible) return null;

  return (
    <Card className="border-ring/20 bg-ring/5 mb-6">
      <CardContent className="flex items-center gap-4 py-4">
        <div className="bg-ring/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
          <Mic className="text-ring h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">
            Try the voice agent free for 14 days
          </p>
          <p className="text-muted-foreground text-xs">
            Ask questions out loud during meetings. Cancel anytime.
          </p>
        </div>
        <Button
          size="sm"
          variant="accent"
          onClick={() => {
            window.location.href = getCheckoutUrl();
          }}
        >
          Start trial
          <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => {
            setVisible(false);
            const state = getState();
            setState({ ...state, dismissedAt: Date.now() });
          }}
          className="text-muted-foreground shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
