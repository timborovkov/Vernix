"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useBilling } from "@/hooks/use-billing";
import {
  Mic,
  FileText,
  MessageSquare,
  Search,
  Plug,
  CreditCard,
  Check,
  ArrowRight,
} from "lucide-react";

const UNLOCKED_FEATURES = [
  {
    icon: Plug,
    label: "Tool integrations",
    description: "Connect Slack, GitHub, Linear, and more for live data",
  },
  {
    icon: Mic,
    label: "Voice agent",
    description: "AI answers questions and takes action during calls",
  },
  {
    icon: Search,
    label: "Cross-meeting search",
    description: "Search across all transcripts and documents",
  },
  {
    icon: FileText,
    label: "200 documents",
    description: "Upload knowledge base docs for richer context",
  },
  {
    icon: MessageSquare,
    label: "AI chat",
    description: "Ask questions about your meetings and get instant answers",
  },
  {
    icon: CreditCard,
    label: "\u20AC30 monthly credit",
    description: "Covers ~10 hours of voice or ~20 hours of silent meetings",
  },
];

export default function WelcomeToProPage() {
  const { billing, loading, error } = useBilling();
  const router = useRouter();

  // Allow access if Pro, trialing, or has a Polar subscription (webhook may not have synced yet)
  const isPro = billing?.plan === "pro";
  const hasAccess = isPro || billing?.trialing || billing?.hasSubscription;
  useEffect(() => {
    if (!loading && (!billing || error || !hasAccess)) {
      router.replace("/dashboard");
    }
  }, [loading, billing, error, hasAccess, router]);

  if (!loading && (!billing || error || !hasAccess)) return null;

  const isTrialing = billing?.trialing ?? false;
  const heading = isTrialing
    ? "Your Pro trial has started!"
    : "Welcome to Pro!";
  const subheading = isTrialing
    ? `You have ${billing?.trialDaysRemaining ?? 14} days of full Pro access. Your subscription activates automatically after the trial.`
    : "You now have full access to everything Vernix offers.";

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
          {loading ? "Setting up your account..." : heading}
        </h1>
        {!loading && (
          <p className="text-muted-foreground mb-8 text-center text-sm">
            {subheading}
          </p>
        )}

        <Card className="mb-6">
          <CardContent className="p-6">
            <p className="mb-4 text-sm font-medium">What you just unlocked:</p>
            <ul className="space-y-3">
              {UNLOCKED_FEATURES.map((f) => (
                <li key={f.label} className="flex items-start gap-3">
                  <div className="bg-ring/10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
                    <f.icon className="text-ring h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{f.label}</p>
                    <p className="text-muted-foreground text-xs">
                      {f.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Button
            className="w-full"
            variant="accent"
            size="lg"
            render={<Link href="/dashboard/integrations" />}
          >
            <Plug className="mr-2 h-4 w-4" />
            Connect your tools
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <div className="flex items-center justify-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/dashboard" />}
            >
              Go to dashboard
            </Button>
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/dashboard/settings" />}
            >
              Manage subscription
            </Button>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs">
          <Check className="h-3.5 w-3.5 text-green-500" />
          <span className="text-muted-foreground">
            {isTrialing
              ? "Cancel anytime before the trial ends"
              : "Cancel or change plans anytime"}
          </span>
        </div>
      </div>
    </div>
  );
}
