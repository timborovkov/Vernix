import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vernix Pricing | Free Plan + Pro from €24/mo",
  description:
    "Free plan with 5 silent meetings/month. Pro from €24/mo with voice agent, tool integrations, and €30 usage credit. 14-day free trial.",
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
