import React from "react";
import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { scaleIn } from "../lib/animations";

export const BrandLogo: React.FC<{
  delay?: number;
  width?: number;
}> = ({ delay = 0, width = 300 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { opacity, scale } = scaleIn(frame, fps, delay);

  return (
    <Img
      src={staticFile("brand/combo/horizontal-dark-nobg.png")}
      style={{
        width,
        opacity,
        transform: `scale(${scale})`,
      }}
    />
  );
};
