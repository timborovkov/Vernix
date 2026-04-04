import React from "react";
import { useCurrentFrame } from "remotion";
import { fadeIn } from "../lib/animations";
import { theme } from "../theme";

export const StaggeredText: React.FC<{
  lines: string[];
  staggerFrames?: number;
  size?: number;
  weight?: number;
  color?: string;
  lineHeight?: number;
}> = ({
  lines,
  staggerFrames = 12,
  size = 56,
  weight = 700,
  color = theme.foreground,
  lineHeight = 1.3,
}) => {
  const frame = useCurrentFrame();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {lines.map((line, i) => {
        const opacity = fadeIn(frame, i * staggerFrames, 10);
        return (
          <div
            key={i}
            style={{
              fontSize: size,
              fontWeight: weight,
              color,
              opacity,
              lineHeight,
            }}
          >
            {line}
          </div>
        );
      })}
    </div>
  );
};
