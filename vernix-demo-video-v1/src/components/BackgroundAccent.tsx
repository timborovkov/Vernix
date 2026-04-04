import React from "react";
import { AbsoluteFill } from "remotion";
import { theme } from "../theme";

export const BackgroundAccent: React.FC<{
  opacity?: number;
}> = ({ opacity = 0.08 }) => {
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at center, ${theme.accent}${Math.round(
          opacity * 255,
        )
          .toString(16)
          .padStart(2, "0")} 0%, transparent 70%)`,
        pointerEvents: "none",
      }}
    />
  );
};
