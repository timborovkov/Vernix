import React from "react";
import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { slideUp, slideInFromRight } from "../lib/animations";
import { theme } from "../theme";

export const Screenshot: React.FC<{
  src: string;
  delay?: number;
  width?: number;
  direction?: "up" | "right";
  /** Percentage of image height to crop from the top (hides browser chrome) */
  cropTop?: number;
  style?: React.CSSProperties;
}> = ({
  src,
  delay = 20,
  width = 1200,
  direction = "up",
  cropTop = 12,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const anim =
    direction === "right"
      ? slideInFromRight(frame, fps, delay)
      : slideUp(frame, fps, delay);

  const transform =
    direction === "right"
      ? `translateX(${(anim as { translateX: number }).translateX}px)`
      : `translateY(${(anim as { translateY: number }).translateY}px)`;

  return (
    <div
      style={{
        opacity: anim.opacity,
        transform,
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: `0 8px 32px ${theme.card}99`,
        width,
        ...style,
      }}
    >
      <div style={{ marginTop: cropTop ? `-${cropTop}%` : 0 }}>
        <Img
          src={staticFile(`screenshots/${src}`)}
          style={{ width: "100%", display: "block" }}
        />
      </div>
    </div>
  );
};
