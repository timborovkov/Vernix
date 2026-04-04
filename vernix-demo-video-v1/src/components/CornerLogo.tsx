import React from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { fadeIn } from "../lib/animations";

export const CornerLogo: React.FC<{
  delay?: number;
  size?: number;
}> = ({ delay = 0, size = 36 }) => {
  const frame = useCurrentFrame();
  const opacity = fadeIn(frame, delay, 10) * 0.5;

  return (
    <Img
      src={staticFile("brand/icon/icon-dark-512.png")}
      style={{
        position: "absolute",
        top: 40,
        left: 48,
        width: size,
        opacity,
      }}
    />
  );
};
