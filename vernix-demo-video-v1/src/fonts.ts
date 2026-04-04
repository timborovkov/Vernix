import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

const fontLoaded = loadFont({
  family: "Geist Sans",
  url: staticFile("fonts/GeistSans-Latin.woff2"),
  weight: "100 900",
});

export const fontFamily = "Geist Sans";
export const waitForFont = () => fontLoaded;
