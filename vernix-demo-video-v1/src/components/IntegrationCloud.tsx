import React from "react";
import {
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { SPRING_CONFIG, theme } from "../theme";

const INTEGRATIONS = [
  { name: "GitHub", logo: "github.svg" },
  { name: "Notion", logo: "notion.svg" },
  { name: "Linear", logo: "linear.svg" },
  { name: "Slack", logo: "slack.svg" },
  { name: "Figma", logo: "figma.svg" },
  { name: "Asana", logo: "asana.svg" },
  { name: "Atlassian", logo: "atlassian.svg" },
  { name: "GitLab", logo: "gitlab.svg" },
  { name: "Sentry", logo: "sentry.svg" },
  { name: "HubSpot", logo: "hubspot.svg" },
  { name: "Intercom", logo: "intercom.svg" },
  { name: "Pipedrive", logo: "pipedrive.svg" },
  { name: "Monday", logo: "monday.svg" },
  { name: "Supabase", logo: "supabase.svg" },
  { name: "Cloudflare", logo: "cloudflare.svg" },
  { name: "Neon", logo: "neon.svg" },
  { name: "Airtable", logo: "airtable.svg" },
  { name: "Zapier", logo: "zapier.svg" },
  { name: "Dropbox", logo: "dropbox.svg" },
  { name: "Discord", logo: "discord.svg" },
  { name: "Trello", logo: "trello.svg" },
  { name: "Exa", logo: "exa.svg" },
  { name: "Tavily", logo: "tavily.svg" },
  { name: "Apify", logo: "apify.svg" },
];

const ICON_SIZE = 48;
const CONTAINER_SIZE = 64;
const GAP = 20;
const COLS = 8;

export const IntegrationCloud: React.FC<{
  delay?: number;
}> = ({ delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const rows = [];
  for (let i = 0; i < INTEGRATIONS.length; i += COLS) {
    rows.push(INTEGRATIONS.slice(i, i + COLS));
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: GAP,
      }}
    >
      {rows.map((row, rowIdx) => (
        <div
          key={rowIdx}
          style={{
            display: "flex",
            gap: GAP,
            justifyContent: "center",
          }}
        >
          {row.map((integration, colIdx) => {
            const idx = rowIdx * COLS + colIdx;
            // Stagger: each icon enters 2 frames after the previous
            const stagger = delay + idx * 2;
            const s = spring({
              frame,
              fps,
              config: SPRING_CONFIG,
              delay: stagger,
            });
            const opacity = interpolate(s, [0, 1], [0, 1]);
            const entryY = interpolate(s, [0, 1], [12, 0]);
            const scale = interpolate(s, [0, 1], [0.8, 1]);

            // Gentle floating after entrance — each icon on its own phase
            const floatPhase = (idx * 0.7 + frame * 0.04) % (Math.PI * 2);
            const floatY = Math.sin(floatPhase) * 2.5 * s; // only active after spring settles
            const translateY = entryY + floatY;

            return (
              <div
                key={integration.name}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  opacity,
                  transform: `translateY(${translateY}px) scale(${scale})`,
                }}
              >
                <div
                  style={{
                    width: CONTAINER_SIZE,
                    height: CONTAINER_SIZE,
                    borderRadius: 14,
                    backgroundColor: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                >
                  <Img
                    src={staticFile(`logos/${integration.logo}`)}
                    style={{
                      width: ICON_SIZE,
                      height: ICON_SIZE,
                      opacity: 0.85,
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: theme.mutedForeground,
                    textAlign: "center",
                    maxWidth: CONTAINER_SIZE + 8,
                    lineHeight: 1.2,
                  }}
                >
                  {integration.name}
                </div>
              </div>
            );
          })}
          {/* "+ more" on the last row if it's not full */}
          {rowIdx === rows.length - 1 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                opacity: interpolate(
                  spring({
                    frame,
                    fps,
                    config: SPRING_CONFIG,
                    delay: delay + INTEGRATIONS.length * 2,
                  }),
                  [0, 1],
                  [0, 1],
                ),
              }}
            >
              <div
                style={{
                  width: CONTAINER_SIZE,
                  height: CONTAINER_SIZE,
                  borderRadius: 14,
                  backgroundColor: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={theme.mutedForeground}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: theme.mutedForeground,
                }}
              >
                + more
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
