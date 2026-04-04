import type { SceneDefinition } from "../types";

export const SCENES: SceneDefinition[] = [
  {
    id: "01-hook",
    voText: "What if your meetings just answered back?",
    voFile: "01-hook.mp3",
    minHoldFrames: 10,
  },
  {
    id: "02-how-it-works",
    voText:
      "Paste a link. Vernix joins as a participant. No plugins, no extensions.",
    voFile: "02-how-it-works.mp3",
    minHoldFrames: 10,
  },
  {
    id: "03-transcript",
    voText: "Every word is transcribed in real time — with speaker names.",
    voFile: "03-transcript.mp3",
    minHoldFrames: 10,
  },
  {
    id: "04-hero",
    voText:
      "During the call, ask Vernix anything. It pulls answers straight from your connected tools. Sprint status from Linear. Customer history from your CRM. Nobody leaves the call.",
    voFile: "04-hero.mp3",
    minHoldFrames: 30,
  },
  {
    id: "05-integrations",
    voText:
      "Connect Slack, Linear, GitHub — dozens of integrations. Set it up once.",
    voFile: "05-integrations.mp3",
    minHoldFrames: 10,
  },
  {
    id: "06-after-call",
    voText:
      "When the call ends — summaries, action items, and semantic search across every call.",
    voFile: "06-after-call.mp3",
    minHoldFrames: 10,
  },
  {
    id: "07-cta",
    voText:
      "Try Vernix for free today and never lose an answer in a meeting again.",
    voFile: "07-cta.mp3",
    minHoldFrames: 90,
  },
];
