import { generateOgImage, ogImageConfig } from "@/lib/og";

export const { size, contentType } = ogImageConfig;

export default function Image() {
  return generateOgImage(
    "About Vernix",
    "An AI agent that sits in your call, remembers everything, and answers questions on the spot."
  );
}
