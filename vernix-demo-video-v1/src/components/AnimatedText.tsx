import React from "react";
import { useCurrentFrame } from "remotion";
import { fadeIn } from "../lib/animations";
import { theme } from "../theme";

export const AnimatedText: React.FC<{
  text: string;
  delay?: number;
  size?: number;
  weight?: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({
  text,
  delay = 0,
  size = 56,
  weight = 700,
  color = theme.foreground,
  style,
}) => {
  const frame = useCurrentFrame();
  const opacity = fadeIn(frame, delay, 10);

  return (
    <div
      style={{
        fontSize: size,
        fontWeight: weight,
        color,
        opacity,
        ...style,
      }}
    >
      {text}
    </div>
  );
};
