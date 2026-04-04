import React from "react";
import { AbsoluteFill } from "remotion";
import { theme } from "../theme";
import { fontFamily } from "../fonts";

export const SceneContainer: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.background,
        fontFamily,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        padding: 80,
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
