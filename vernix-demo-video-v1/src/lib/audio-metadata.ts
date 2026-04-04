import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { staticFile } from "remotion";
import { SCENES } from "./scene-config";
import { VIDEO, TRANSITION_DURATION } from "../theme";

export interface DemoVideoProps extends Record<string, unknown> {
  sceneDurations: number[];
}

export async function calculateVideoMetadata(): Promise<{
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  props: DemoVideoProps;
}> {
  const sceneDurations: number[] = [];

  for (const scene of SCENES) {
    const voUrl = staticFile(`audio/voiceover/${scene.voFile}`);
    const durationSec = await getAudioDurationInSeconds(voUrl);
    const voFrames = Math.ceil(durationSec * VIDEO.fps);
    sceneDurations.push(voFrames + scene.minHoldFrames);
  }

  const totalSceneFrames = sceneDurations.reduce((a, b) => a + b, 0);
  const totalTransitionOverlap = (SCENES.length - 1) * TRANSITION_DURATION;
  const durationInFrames = totalSceneFrames - totalTransitionOverlap;

  return {
    durationInFrames,
    fps: VIDEO.fps,
    width: VIDEO.width,
    height: VIDEO.height,
    props: { sceneDurations },
  };
}
