import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Img,
  staticFile,
  spring,
} from "remotion";
import type { SceneProps } from "../types";
import { SceneContainer } from "../components/SceneContainer";
import { theme, SPRING_CONFIG } from "../theme";
import { fadeIn, scaleIn } from "../lib/animations";

const HERO_ICONS = [
  "github.svg",
  "linear.svg",
  "slack.svg",
  "notion.svg",
  "figma.svg",
  "hubspot.svg",
];

export const Scene01Hook: React.FC<SceneProps> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoAnim = scaleIn(frame, fps, 0);
  const titleOpacity = fadeIn(frame, 8, 10);
  const subtitleOpacity = fadeIn(frame, 16, 10);

  // Screenshot slides up
  const screenshotSpring = spring({
    frame,
    fps,
    config: SPRING_CONFIG,
    delay: 12,
  });
  const screenshotY = interpolate(screenshotSpring, [0, 1], [30, 0]);
  const screenshotOpacity = interpolate(screenshotSpring, [0, 1], [0, 1]);

  // Subtle ken burns on screenshot
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.02], {
    extrapolateRight: "clamp",
  });

  return (
    <SceneContainer style={{ padding: 48, gap: 0 }}>
      {/* Top section: logo + title + icons */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          marginBottom: 28,
        }}
      >
        {/* Wordmark logo */}
        <Img
          src={staticFile("brand/combo/horizontal-dark-nobg.png")}
          style={{
            width: 220,
            opacity: logoAnim.opacity,
            transform: `scale(${logoAnim.scale})`,
          }}
        />

        {/* Title */}
        <div
          style={{
            fontSize: 42,
            fontWeight: 700,
            color: theme.foreground,
            opacity: titleOpacity,
            textAlign: "center",
            lineHeight: 1.2,
          }}
        >
          AI that answers questions in your meetings
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 22,
            fontWeight: 400,
            color: theme.mutedForeground,
            opacity: subtitleOpacity,
            textAlign: "center",
          }}
        >
          Connected to your tools. Live during the call.
        </div>

        {/* Mini integration icons row */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 8,
          }}
        >
          {HERO_ICONS.map((logo, i) => {
            const s = spring({
              frame,
              fps,
              config: SPRING_CONFIG,
              delay: 20 + i * 3,
            });
            const opacity = interpolate(s, [0, 1], [0, 1]);
            const iconScale = interpolate(s, [0, 1], [0.7, 1]);
            const floatY =
              Math.sin((i * 0.9 + frame * 0.05) % (Math.PI * 2)) * 2 * s;

            return (
              <div
                key={logo}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                  opacity,
                  transform: `scale(${iconScale}) translateY(${floatY}px)`,
                }}
              >
                <Img
                  src={staticFile(`logos/${logo}`)}
                  style={{ width: 24, height: 24, opacity: 0.85 }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Screenshot — smaller, below */}
      <div
        style={{
          width: "72%",
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "0 8px 40px rgba(0,0,0,0.45)",
          opacity: screenshotOpacity,
          transform: `translateY(${screenshotY}px) scale(${scale})`,
        }}
      >
        <div style={{ marginTop: "-12%" }}>
          <Img
            src={staticFile("screenshots/screenshot-chat-answer.png")}
            style={{ width: "100%", display: "block" }}
          />
        </div>
      </div>
    </SceneContainer>
  );
};
