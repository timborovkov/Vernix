import { generateOgImage, ogImageConfig } from "@/lib/og";

export const { size, contentType } = ogImageConfig;

export default function Image() {
  return generateOgImage(
    "AI Call Transcription and Search",
    "Automatic transcription, summaries, and action items. Search across all your calls."
  );
}
