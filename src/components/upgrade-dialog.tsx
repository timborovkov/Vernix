"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Lock,
  Gauge,
  Mic,
  FileText,
  MessageSquare,
  Users,
  Clock,
  Zap,
} from "lucide-react";
import { PRICING, PLANS, LIMITS, DISPLAY } from "@/lib/billing/constants";
import { useBilling } from "@/hooks/use-billing";
import { getCheckoutUrl } from "@/lib/billing/checkout-url";

// ---------------------------------------------------------------------------
// Paywall trigger types — each one maps to specific copy and value props
// ---------------------------------------------------------------------------

export type PaywallTrigger =
  | "voice_gate"
  | "meeting_minutes"
  | "meeting_count"
  | "concurrent_meetings"
  | "document_count"
  | "document_storage"
  | "document_uploads"
  | "document_size"
  | "rag_queries"
  | "api_access"
  | "api_rate"
  | "generic_feature"
  | "generic_quota";

interface TriggerCopy {
  icon: React.ElementType;
  title: string;
  description: string;
  proValue: string;
  limitType: "feature" | "quota";
}

const TRIGGER_COPY: Record<PaywallTrigger, TriggerCopy> = {
  voice_gate: {
    icon: Mic,
    title: "Unlock the voice agent",
    description:
      "Connect your tools and get an assistant that answers questions with real business data during calls. Ask it to look things up, take action, or pull reports, live.",
    proValue: `Tool integrations, voice agent, unlimited calls with ${DISPLAY.monthlyCredit} monthly credit`,
    limitType: "feature",
  },
  meeting_minutes: {
    icon: Clock,
    title: "Monthly minutes used up",
    description: `You've used all your call minutes for this period. Upgrade to Pro for unlimited minutes with ${DISPLAY.monthlyCredit} of usage credit included every month.`,
    proValue: `${DISPLAY.monthlyCredit} credit covers ~${DISPLAY.voiceHoursPerCredit} hrs voice or ~${DISPLAY.silentHoursPerCredit} hrs silent per month`,
    limitType: "quota",
  },
  meeting_count: {
    icon: Users,
    title: "Monthly call limit reached",
    description: "You've reached the maximum number of calls for this period.",
    proValue: `Up to ${LIMITS[PLANS.PRO].meetingsPerMonth} calls per month`,
    limitType: "quota",
  },
  concurrent_meetings: {
    icon: Users,
    title: "One call at a time on Free",
    description: `Free accounts can run one call at a time. Upgrade to run up to ${LIMITS[PLANS.PRO].concurrentMeetings} calls simultaneously.`,
    proValue: `${LIMITS[PLANS.PRO].concurrentMeetings} concurrent calls`,
    limitType: "feature",
  },
  document_count: {
    icon: FileText,
    title: "Knowledge base full",
    description: `Free accounts include ${LIMITS[PLANS.FREE].documentsCount} documents. Upgrade to Pro for ${LIMITS[PLANS.PRO].documentsCount} documents and ${LIMITS[PLANS.PRO].totalStorageMB}MB storage. Upload team docs, onboarding guides, specs, and more.`,
    proValue: `${LIMITS[PLANS.PRO].documentsCount} documents, ${LIMITS[PLANS.PRO].totalStorageMB}MB storage`,
    limitType: "feature",
  },
  document_storage: {
    icon: FileText,
    title: "Storage limit reached",
    description: `Your ${LIMITS[PLANS.FREE].totalStorageMB}MB free storage is full. Upgrade for ${LIMITS[PLANS.PRO].totalStorageMB}MB.`,
    proValue: `${LIMITS[PLANS.PRO].totalStorageMB}MB document storage`,
    limitType: "feature",
  },
  document_uploads: {
    icon: FileText,
    title: "Monthly upload limit reached",
    description:
      "You've used all your document uploads for this period. Upgrade for more.",
    proValue: `${LIMITS[PLANS.PRO].docUploadsPerMonth} uploads per month`,
    limitType: "quota",
  },
  document_size: {
    icon: FileText,
    title: "File too large",
    description: `Free accounts support files up to ${LIMITS[PLANS.FREE].maxDocumentSizeMB}MB. Pro supports up to ${LIMITS[PLANS.PRO].maxDocumentSizeMB}MB.`,
    proValue: `${LIMITS[PLANS.PRO].maxDocumentSizeMB}MB max file size`,
    limitType: "feature",
  },
  rag_queries: {
    icon: MessageSquare,
    title: "Daily question limit reached",
    description: `You've used all ${LIMITS[PLANS.FREE].ragQueriesPerDay} questions for today. Upgrade for ${LIMITS[PLANS.PRO].ragQueriesPerDay} per day — keep asking about your calls.`,
    proValue: `${LIMITS[PLANS.PRO].ragQueriesPerDay} queries per day`,
    limitType: "quota",
  },
  api_access: {
    icon: Zap,
    title: "Integrations require Pro",
    description:
      "Connect tools like Slack, Linear, GitHub, or your CRM. The agent pulls live data and takes action during your calls.",
    proValue: `Tool integrations, ${LIMITS[PLANS.PRO].apiRequestsPerDay} API requests/day`,
    limitType: "feature",
  },
  api_rate: {
    icon: Zap,
    title: "Daily API limit reached",
    description: `You've hit the ${LIMITS[PLANS.PRO].apiRequestsPerDay} request/day limit.`,
    proValue: "Contact us for higher API limits",
    limitType: "quota",
  },
  generic_feature: {
    icon: Lock,
    title: "Feature requires Pro",
    description: "This feature is available on the Pro plan.",
    proValue: "Everything included with Pro",
    limitType: "feature",
  },
  generic_quota: {
    icon: Gauge,
    title: "Limit reached",
    description: "You've reached your usage limit for this period.",
    proValue: "Higher limits on Pro",
    limitType: "quota",
  },
};

// ---------------------------------------------------------------------------
// Detect the best paywall trigger from an error message
// ---------------------------------------------------------------------------

export function detectPaywallTrigger(
  errorMessage: string,
  isFeatureGate: boolean
): PaywallTrigger {
  const msg = errorMessage.toLowerCase();

  if (msg.includes("voice")) return "voice_gate";
  if (
    msg.includes("minutes exhausted") ||
    msg.includes("monthly meeting minutes")
  )
    return "meeting_minutes";
  if (msg.includes("monthly meeting limit")) return "meeting_count";
  if (msg.includes("concurrent")) return "concurrent_meetings";
  if (msg.includes("maximum") && msg.includes("document"))
    return "document_count";
  if (msg.includes("storage limit")) return "document_storage";
  if (msg.includes("upload limit") || msg.includes("monthly upload"))
    return "document_uploads";
  if (msg.includes("exceeds") && msg.includes("mb")) return "document_size";
  if (msg.includes("rag query limit") || msg.includes("daily rag"))
    return "rag_queries";
  if (msg.includes("api access")) return "api_access";
  if (msg.includes("api request limit") || msg.includes("daily api"))
    return "api_rate";

  return isFeatureGate ? "generic_feature" : "generic_quota";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: PaywallTrigger;
  /** Override description with the raw error message if desired */
  errorMessage?: string;
}

export function UpgradeDialog({
  open,
  onOpenChange,
  trigger,
  errorMessage,
}: UpgradeDialogProps) {
  const { billing } = useBilling();
  const copy = TRIGGER_COPY[trigger];
  const Icon = copy.icon;

  const isPro = billing?.plan === PLANS.PRO;
  const isTrialing = billing?.trialing;
  const trialDays = billing?.trialDaysRemaining ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-1 flex items-center gap-3">
            <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
              <Icon className="text-muted-foreground h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base">{copy.title}</DialogTitle>
              {billing && (
                <Badge variant="outline" className="mt-1">
                  {isTrialing
                    ? `Pro Trial: ${trialDays}d left`
                    : isPro
                      ? "Pro"
                      : "Free"}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">
            {errorMessage || copy.description}
          </p>

          {/* Value prop */}
          <div className="bg-muted/50 rounded-lg px-3 py-2">
            <p className="text-xs font-medium">With Pro:</p>
            <p className="text-muted-foreground text-xs">{copy.proValue}</p>
          </div>

          {/* Trial context */}
          {isTrialing && trialDays > 0 && (
            <p className="text-muted-foreground text-xs">
              You have Pro access for {trialDays} more day
              {trialDays !== 1 ? "s" : ""}. Your subscription will activate
              automatically after the trial.
            </p>
          )}
          {isTrialing && trialDays === 0 && (
            <p className="text-muted-foreground text-xs">
              Your trial has ended. Upgrade to restore Pro features.
            </p>
          )}

          {/* Quota reset note */}
          {copy.limitType === "quota" && (
            <p className="text-muted-foreground text-xs">
              Your limit resets at the start of your next billing period.
            </p>
          )}
        </div>

        {!isPro && !isTrialing && (
          <div className="flex gap-2">
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
        )}
        <p className="text-muted-foreground text-center text-xs">
          {DISPLAY.trialDays}-day free trial. Cancel anytime.
        </p>
        <DialogFooter>
          <Button
            variant="ghost"
            className="w-full"
            render={<Link href="/pricing" />}
            onClick={() => onOpenChange(false)}
          >
            {isPro ? "View plan details" : "Compare plans"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
