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
import { Lock, Gauge } from "lucide-react";
import { PRICING, PLANS } from "@/lib/billing/constants";
import { useBilling } from "@/hooks/use-billing";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** "feature" = hard gate (403), "quota" = exhausted limit (429) */
  limitType: "feature" | "quota";
}

export function UpgradeDialog({
  open,
  onOpenChange,
  title,
  description,
  limitType,
}: UpgradeDialogProps) {
  const { billing } = useBilling();

  const productId = process.env.NEXT_PUBLIC_POLAR_PRODUCT_ID_PRO_MONTHLY;
  const checkoutParams = new URLSearchParams({
    ...(productId ? { products: productId } : {}),
  });
  const checkoutUrl = productId
    ? `/api/checkout?${checkoutParams.toString()}`
    : "/pricing";

  const Icon = limitType === "feature" ? Lock : Gauge;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-2 flex items-center gap-3">
            <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
              <Icon className="text-muted-foreground h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base">{title}</DialogTitle>
              {billing && (
                <Badge variant="outline" className="mt-1">
                  {billing.plan === PLANS.PRO ? "Pro" : "Free"}
                  {billing.trialing ? " (trial)" : ""}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <p className="text-muted-foreground text-sm">{description}</p>

        {limitType === "quota" && (
          <p className="text-muted-foreground text-xs">
            Your limit resets at the start of your next billing period. Upgrade
            for higher limits.
          </p>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="accent"
            className="w-full sm:w-auto"
            onClick={() => {
              window.location.href = checkoutUrl;
            }}
          >
            Upgrade to Pro — €{PRICING[PLANS.PRO].monthly}/mo
          </Button>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            render={<Link href="/pricing" />}
            onClick={() => onOpenChange(false)}
          >
            View plans
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
