import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { SPRING_CONFIG } from "../theme";

/**
 * Zoom logo - video camera icon on blue bg
 */
const ZoomLogo: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="64" height="64" rx="14" fill="#0B5CFF" />
    <rect x="15" y="22" width="24" height="20" rx="4" fill="white" />
    <path d="M42 26L52 21V43L42 38V26Z" fill="white" />
  </svg>
);

/**
 * Google Meet logo - camera with green gradient
 */
const MeetLogo: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="64" height="64" rx="14" fill="#00AC47" />
    <rect x="13" y="20" width="26" height="24" rx="3" fill="white" />
    <path d="M42 25L53 18V46L42 39V25Z" fill="white" />
    <rect x="19" y="28" width="4" height="8" rx="2" fill="#00AC47" />
    <rect x="26" y="28" width="4" height="8" rx="2" fill="#00AC47" />
  </svg>
);

/**
 * Microsoft Teams logo - T on purple bg
 */
const TeamsLogo: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="64" height="64" rx="14" fill="#5B5FC7" />
    <circle cx="44" cy="22" r="7" fill="white" opacity="0.8" />
    <rect x="14" y="18" width="28" height="28" rx="4" fill="white" />
    <text
      x="28"
      y="39"
      textAnchor="middle"
      fill="#5B5FC7"
      fontSize="22"
      fontWeight="700"
      fontFamily="Arial, sans-serif"
    >
      T
    </text>
  </svg>
);

/**
 * Webex logo - interlocking circles on green bg
 */
const WebexLogo: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="64" height="64" rx="14" fill="#07C160" />
    <circle cx="27" cy="32" r="11" fill="white" />
    <circle cx="37" cy="32" r="11" fill="white" />
    <path
      d="M32 23.5C34.5 26 36 29 36 32C36 35 34.5 38 32 40.5C29.5 38 28 35 28 32C28 29 29.5 26 32 23.5Z"
      fill="#07C160"
    />
  </svg>
);

const PLATFORMS = [
  { name: "Zoom", Logo: ZoomLogo },
  { name: "Google Meet", Logo: MeetLogo },
  { name: "Teams", Logo: TeamsLogo },
  { name: "Webex", Logo: WebexLogo },
];

export const PlatformLogos: React.FC<{
  delay?: number;
}> = ({ delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        display: "flex",
        gap: 48,
        alignItems: "center",
        marginTop: 24,
      }}
    >
      {PLATFORMS.map(({ name, Logo }, i) => {
        const stagger = delay + i * 6;
        const s = spring({
          frame,
          fps,
          config: SPRING_CONFIG,
          delay: stagger,
        });
        const opacity = interpolate(s, [0, 1], [0, 1]);
        const entryY = interpolate(s, [0, 1], [10, 0]);
        // Gentle float after entrance
        const floatY =
          Math.sin((i * 0.8 + frame * 0.05) % (Math.PI * 2)) * 2 * s;
        const translateY = entryY + floatY;

        return (
          <div
            key={name}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              opacity,
              transform: `translateY(${translateY}px)`,
            }}
          >
            <Logo size={56} />
            <div
              style={{
                fontSize: 16,
                fontWeight: 500,
                color: "#b0b0b0",
                letterSpacing: 0.3,
              }}
            >
              {name}
            </div>
          </div>
        );
      })}
    </div>
  );
};
