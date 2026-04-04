import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Img,
  staticFile,
} from "remotion";
import type { SceneProps } from "../types";
import { SceneContainer } from "../components/SceneContainer";
import { AnimatedText } from "../components/AnimatedText";
import { CornerLogo } from "../components/CornerLogo";
import { PlatformLogos } from "../components/PlatformLogos";
import { slideUp } from "../lib/animations";
import { theme } from "../theme";

export const Scene02HowItWorks: React.FC<SceneProps> = ({
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const img1Anim = slideUp(frame, fps, 8);

  // Crossfade at 45% of scene
  const crossfadeStart = Math.round(durationInFrames * 0.45);
  const img1Opacity = interpolate(
    frame,
    [crossfadeStart, crossfadeStart + 12],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const img2Opacity = interpolate(
    frame,
    [crossfadeStart, crossfadeStart + 12],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <SceneContainer style={{ gap: 20, padding: 48 }}>
      <CornerLogo />
      <AnimatedText
        text="Paste a link. Vernix joins."
        size={44}
        weight={700}
        delay={0}
      />
      <div
        style={{
          position: "relative",
          width: 1050,
          opacity: img1Anim.opacity,
          transform: `translateY(${img1Anim.translateY}px)`,
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: `0 8px 32px ${theme.card}99`,
        }}
      >
        <Img
          src={staticFile("screenshots/screenshot-create-meeting.png")}
          style={{
            width: "100%",
            display: "block",
            opacity: img1Opacity,
            marginTop: "-12%",
          }}
        />
        <Img
          src={staticFile("screenshots/screenshot-active-call.png")}
          style={{
            width: "100%",
            display: "block",
            position: "absolute",
            top: 0,
            left: 0,
            opacity: img2Opacity,
            marginTop: "-12%",
          }}
        />
      </div>
      <PlatformLogos delay={Math.round(0.5 * fps)} />
    </SceneContainer>
  );
};
