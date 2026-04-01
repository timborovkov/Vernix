import type { Metadata } from "next";
import { DISPLAY, LIMITS, PLANS, FREE_TRIAL } from "@/lib/billing/constants";

export const metadata: Metadata = {
  title: `Vernix Pricing | Free Plan + Pro from ${DISPLAY.proAnnual}/mo`,
  description: `Free plan with ${LIMITS[PLANS.FREE].meetingsPerMonth} silent meetings/month. Pro from ${DISPLAY.proAnnual}/mo with voice agent, tool integrations, and ${DISPLAY.monthlyCredit} usage credit. ${FREE_TRIAL.days}-day free trial.`,
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
