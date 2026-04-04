import React from "react";
import type { SceneProps } from "../types";
import { SceneContainer } from "../components/SceneContainer";
import { AnimatedText } from "../components/AnimatedText";
import { CornerLogo } from "../components/CornerLogo";
import { IntegrationCloud } from "../components/IntegrationCloud";

export const Scene05Integrations: React.FC<SceneProps> = () => {
  return (
    <SceneContainer style={{ gap: 28, padding: 48 }}>
      <CornerLogo />
      <AnimatedText
        text="Connect once. Use everywhere."
        size={44}
        weight={700}
        delay={0}
      />
      <IntegrationCloud delay={10} />
    </SceneContainer>
  );
};
