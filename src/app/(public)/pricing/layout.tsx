import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Vernix",
  description:
    "Simple pricing for Vernix. Free forever for silent meetings. Pro at $29/mo with $30 usage credit for voice agent, API, and MCP access.",
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
