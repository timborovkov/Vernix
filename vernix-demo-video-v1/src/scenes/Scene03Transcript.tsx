import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import type { SceneProps } from "../types";
import { SceneContainer } from "../components/SceneContainer";
import { AnimatedText } from "../components/AnimatedText";
import { Screenshot } from "../components/Screenshot";
import { CornerLogo } from "../components/CornerLogo";
import { BackgroundAccent } from "../components/BackgroundAccent";

export const Scene03Transcript: React.FC<SceneProps> = ({
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  // Subtle zoom on screenshot
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.02], {
    extrapolateRight: "clamp",
  });

  return (
    <SceneContainer style={{ gap: 24 }}>
      <BackgroundAccent opacity={0.04} />
      <CornerLogo />
      <AnimatedText
        text="Who said what. Always."
        size={44}
        weight={700}
        delay={0}
      />
      <div style={{ transform: `scale(${scale})` }}>
        <Screenshot src="screenshot-transcript.png" delay={12} width={1100} />
      </div>
    </SceneContainer>
  );
};
