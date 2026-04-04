import React from "react";
import { useCurrentFrame, interpolate, Img, staticFile } from "remotion";
import type { SceneProps } from "../types";
import { SceneContainer } from "../components/SceneContainer";
import { CornerLogo } from "../components/CornerLogo";
import { theme } from "../theme";
import { fadeIn } from "../lib/animations";

const SCREENSHOTS = [
  "screenshot-summary.png",
  "screenshot-tasks.png",
  "screenshot-search.png",
];

export const Scene06AfterCall: React.FC<SceneProps> = ({
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  // Divide scene into 3 equal segments with 10-frame crossfades
  const segmentLength = Math.floor(durationInFrames / 3);
  const containerOpacity = fadeIn(frame, 8, 10);
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.02], {
    extrapolateRight: "clamp",
  });

  // Heading words highlight one at a time
  const words = ["Summaries.", "Tasks.", "Search."];
  const wordDuration = Math.floor(durationInFrames / 3);

  return (
    <SceneContainer style={{ gap: 24 }}>
      <CornerLogo />
      <div style={{ display: "flex", gap: 16 }}>
        {words.map((word, i) => {
          const wordStart = i * wordDuration;
          const isActive =
            frame >= wordStart && frame < wordStart + wordDuration;
          const wordOpacity = fadeIn(frame, 0, 10);
          return (
            <div
              key={word}
              style={{
                fontSize: 44,
                fontWeight: 700,
                color: isActive ? theme.foreground : theme.mutedForeground,
                opacity: wordOpacity,
              }}
            >
              {word}
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: "relative",
          width: 1100,
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: `0 8px 32px ${theme.card}99`,
          opacity: containerOpacity,
          transform: `scale(${scale})`,
        }}
      >
        <div>
          {SCREENSHOTS.map((src, i) => {
            const segStart = i * segmentLength;
            const segEnd = segStart + segmentLength;

            // Fade in at start of segment, fade out at end
            let opacity: number;
            if (i === 0) {
              // First: visible from start, fade out at end
              opacity = interpolate(frame, [segEnd - 10, segEnd], [1, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
            } else if (i === SCREENSHOTS.length - 1) {
              // Last: fade in, stay visible
              opacity = interpolate(frame, [segStart, segStart + 10], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
            } else {
              // Middle: fade in and fade out
              const fadeInVal = interpolate(
                frame,
                [segStart, segStart + 10],
                [0, 1],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                },
              );
              const fadeOutVal = interpolate(
                frame,
                [segEnd - 10, segEnd],
                [1, 0],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                },
              );
              opacity = Math.min(fadeInVal, fadeOutVal);
            }

            return (
              <Img
                key={src}
                src={staticFile(`screenshots/${src}`)}
                style={{
                  width: "100%",
                  display: "block",
                  position: i === 0 ? "relative" : "absolute",
                  top: 0,
                  left: 0,
                  opacity,
                  marginTop: "-12%",
                }}
              />
            );
          })}
        </div>
      </div>
    </SceneContainer>
  );
};
