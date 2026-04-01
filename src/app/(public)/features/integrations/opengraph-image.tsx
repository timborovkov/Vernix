import { generateOgImage, ogImageConfig } from "@/lib/og";

export const { size, contentType } = ogImageConfig;

export default function Image() {
  return generateOgImage(
    "Connect Your Tools to Video Calls",
    "Slack, Linear, GitHub, CRM — ask Vernix and get live answers during the call."
  );
}
