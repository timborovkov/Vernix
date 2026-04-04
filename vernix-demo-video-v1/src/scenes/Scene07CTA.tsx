import React from "react";
import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { SceneProps } from "../types";
import { SceneContainer } from "../components/SceneContainer";
import { AnimatedText } from "../components/AnimatedText";
import { BackgroundAccent } from "../components/BackgroundAccent";
import { scaleIn } from "../lib/animations";
import { theme } from "../theme";

export const Scene07CTA: React.FC<SceneProps> = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { opacity, scale } = scaleIn(frame, fps, 0);

  // Pulsing glow behind CTA text
  const glowPulse = Math.sin(frame * 0.08) * 0.05 + 0.15;
  const glowScale = 1 + Math.sin(frame * 0.06) * 0.05;

  return (
    <SceneContainer style={{ gap: 28 }}>
      <BackgroundAccent opacity={0.05} />
      <Img
        src={staticFile("brand/icon/icon-dark-512.png")}
        style={{
          width: 100,
          opacity,
          transform: `scale(${scale})`,
        }}
      />
      <div style={{ position: "relative", marginTop: 8 }}>
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(-50%, -50%) scale(${glowScale})`,
            width: 500,
            height: 120,
            background: theme.accent,
            opacity: glowPulse,
            filter: "blur(50px)",
            borderRadius: 60,
            pointerEvents: "none",
          }}
        />
        <AnimatedText
          text="Try Vernix free"
          size={52}
          weight={700}
          delay={10}
          style={{ position: "relative" }}
        />
      </div>
      <AnimatedText
        text="vernix.app"
        size={32}
        weight={400}
        color={theme.mutedForeground}
        delay={18}
      />
    </SceneContainer>
  );
};
