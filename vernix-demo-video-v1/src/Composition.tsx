import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useVideoConfig,
} from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { TRANSITION_DURATION } from "./theme";
import { SCENES } from "./lib/scene-config";
import type { DemoVideoProps } from "./lib/audio-metadata";

import { Scene01Hook } from "./scenes/Scene01Hook";
import { Scene02HowItWorks } from "./scenes/Scene02HowItWorks";
import { Scene03Transcript } from "./scenes/Scene03Transcript";
import { Scene04Hero } from "./scenes/Scene04Hero";
import { Scene05Integrations } from "./scenes/Scene05Integrations";
import { Scene06AfterCall } from "./scenes/Scene06AfterCall";
import { Scene07CTA } from "./scenes/Scene07CTA";

const SCENE_COMPONENTS = [
  Scene01Hook,
  Scene02HowItWorks,
  Scene03Transcript,
  Scene04Hero,
  Scene05Integrations,
  Scene06AfterCall,
  Scene07CTA,
];

export const DemoVideo: React.FC<DemoVideoProps> = ({ sceneDurations }) => {
  const { fps } = useVideoConfig();

  if (!sceneDurations || sceneDurations.length === 0) {
    return null;
  }

  // Calculate scene start frames accounting for transition overlaps
  const sceneStartFrames: number[] = [];
  let runningStart = 0;
  for (let i = 0; i < sceneDurations.length; i++) {
    sceneStartFrames.push(runningStart);
    if (i < sceneDurations.length - 1) {
      runningStart += sceneDurations[i] - TRANSITION_DURATION;
    }
  }

  // Build TransitionSeries children
  const transitionChildren: React.ReactNode[] = [];
  for (let i = 0; i < SCENE_COMPONENTS.length; i++) {
    const SceneComp = SCENE_COMPONENTS[i];
    transitionChildren.push(
      <TransitionSeries.Sequence
        key={`scene-${i}`}
        durationInFrames={sceneDurations[i]}
        premountFor={fps}
      >
        <SceneComp durationInFrames={sceneDurations[i]} />
      </TransitionSeries.Sequence>,
    );
    if (i < SCENE_COMPONENTS.length - 1) {
      transitionChildren.push(
        <TransitionSeries.Transition
          key={`transition-${i}`}
          presentation={fade()}
          timing={linearTiming({
            durationInFrames: TRANSITION_DURATION,
          })}
        />,
      );
    }
  }

  return (
    <AbsoluteFill>
      {/* Per-scene voiceovers */}
      {SCENES.map((scene, i) => (
        <Sequence
          key={scene.id}
          from={sceneStartFrames[i]}
          name={`VO-${scene.id}`}
          premountFor={fps}
        >
          <Audio src={staticFile(`audio/voiceover/${scene.voFile}`)} />
        </Sequence>
      ))}

      {/* Visual scenes with transitions */}
      <TransitionSeries>{transitionChildren}</TransitionSeries>
    </AbsoluteFill>
  );
};
