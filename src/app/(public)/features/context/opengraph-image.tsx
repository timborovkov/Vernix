import { generateOgImage, ogImageConfig } from "@/lib/og";

export const { size, contentType } = ogImageConfig;

export default function Image() {
  return generateOgImage(
    "Upload Docs, Get Answers During Calls",
    "Your PDFs, specs, and reports — available to the AI agent during every video call."
  );
}
