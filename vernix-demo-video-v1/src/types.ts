export interface SceneProps {
  durationInFrames: number;
}

export interface SceneDefinition {
  id: string;
  voText: string;
  voFile: string;
  minHoldFrames: number;
}
