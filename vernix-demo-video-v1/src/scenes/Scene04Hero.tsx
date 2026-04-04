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
import { CornerLogo } from "../components/CornerLogo";
import { theme, SPRING_CONFIG } from "../theme";
import { fadeIn } from "../lib/animations";

const PROMPTS = [
  "What issues do I have on Linear?",
  "Show me open PRs on the main repo",
  "What did we discuss about pricing last week?",
  "Summarize the onboarding checklist in Notion",
];

const TOOL_ICONS = [
  { logo: "linear.svg", name: "Linear" },
  { logo: "github.svg", name: "GitHub" },
  { logo: "slack.svg", name: "Slack" },
  { logo: "notion.svg", name: "Notion" },
  { logo: "hubspot.svg", name: "HubSpot" },
];

export const Scene04Hero: React.FC<SceneProps> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Cycling prompt — each visible for ~2.5s (75 frames)
  const promptCycleDuration = 75;
  const currentPromptIdx =
    Math.floor(frame / promptCycleDuration) % PROMPTS.length;
  const frameInCycle = frame % promptCycleDuration;

  // Fade in/out within each cycle
  const promptOpacity = interpolate(
    frameInCycle,
    [0, 8, promptCycleDuration - 8, promptCycleDuration],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Screenshot
  const screenshotSpring = spring({
    frame,
    fps,
    config: SPRING_CONFIG,
    delay: 10,
  });
  const screenshotY = interpolate(screenshotSpring, [0, 1], [20, 0]);
  const screenshotOpacity = interpolate(screenshotSpring, [0, 1], [0, 1]);
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.03], {
    extrapolateRight: "clamp",
  });

  // Tool icons
  const iconsOpacity = fadeIn(frame, 6, 10);

  return (
    <SceneContainer style={{ gap: 16, padding: 48 }}>
      <CornerLogo />

      {/* Cycling prompt text */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            fontSize: 36,
            fontWeight: 500,
            color: theme.accentForeground,
            fontStyle: "italic",
            opacity: promptOpacity,
            textAlign: "center",
            height: 50,
            display: "flex",
            alignItems: "center",
          }}
        >
          &ldquo;{PROMPTS[currentPromptIdx]}&rdquo;
        </div>
        {/* Cycling dots */}
        <div style={{ display: "flex", gap: 8 }}>
          {PROMPTS.map((_, i) => (
            <div
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor:
                  i === currentPromptIdx
                    ? theme.accentForeground
                    : theme.mutedForeground,
                opacity: i === currentPromptIdx ? 1 : 0.3,
              }}
            />
          ))}
        </div>
      </div>

      {/* Tool icons row */}
      <div
        style={{
          display: "flex",
          gap: 14,
          opacity: iconsOpacity,
          marginBottom: 4,
        }}
      >
        {TOOL_ICONS.map(({ logo, name }, i) => {
          const s = spring({
            frame,
            fps,
            config: SPRING_CONFIG,
            delay: 14 + i * 3,
          });
          const iconOpacity = interpolate(s, [0, 1], [0, 1]);
          const iconScale = interpolate(s, [0, 1], [0.7, 1]);

          return (
            <div
              key={name}
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                backgroundColor: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                opacity: iconOpacity,
                transform: `scale(${iconScale})`,
              }}
            >
              <Img
                src={staticFile(`logos/${logo}`)}
                style={{ width: 22, height: 22, opacity: 0.85 }}
              />
            </div>
          );
        })}
      </div>

      {/* Screenshot */}
      <div
        style={{
          width: "78%",
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
