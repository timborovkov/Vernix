import { interpolate, spring } from "remotion";
import { SPRING_CONFIG } from "../theme";

export function fadeIn(
  frame: number,
  startFrame: number = 0,
  duration: number = 10,
): number {
  return interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

export function slideUp(
  frame: number,
  fps: number,
  delay: number = 0,
  distance: number = 20,
): { opacity: number; translateY: number } {
  const s = spring({ frame, fps, config: SPRING_CONFIG, delay });
  return {
    opacity: interpolate(s, [0, 1], [0, 1]),
    translateY: interpolate(s, [0, 1], [distance, 0]),
  };
}

export function slideInFromRight(
  frame: number,
  fps: number,
  delay: number = 0,
  distance: number = 40,
): { opacity: number; translateX: number } {
  const s = spring({ frame, fps, config: SPRING_CONFIG, delay });
  return {
    opacity: interpolate(s, [0, 1], [0, 1]),
    translateX: interpolate(s, [0, 1], [distance, 0]),
  };
}

export function scaleIn(
  frame: number,
  fps: number,
  delay: number = 0,
): { opacity: number; scale: number } {
  const s = spring({ frame, fps, config: SPRING_CONFIG, delay });
  return {
    opacity: interpolate(s, [0, 1], [0, 1]),
    scale: interpolate(s, [0, 1], [0.8, 1]),
  };
}
