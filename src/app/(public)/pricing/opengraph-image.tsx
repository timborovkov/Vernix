import { generateOgImage, ogImageConfig } from "@/lib/og";
import { DISPLAY, FREE_TRIAL } from "@/lib/billing/constants";

export const { size, contentType } = ogImageConfig;

export default function Image() {
  return generateOgImage(
    "Vernix Pricing",
    `Free plan included. Pro from ${DISPLAY.proAnnual}/mo with ${FREE_TRIAL.days}-day free trial.`
  );
}
