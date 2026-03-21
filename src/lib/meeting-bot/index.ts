import type { MeetingBotProvider } from "./types";
import { RecallProvider } from "./recall";
import { MockProvider } from "./mock";

export function getMeetingBotProvider(): MeetingBotProvider {
  const provider = process.env.MEETING_BOT_PROVIDER ?? "mock";

  switch (provider) {
    case "recall":
      return new RecallProvider();
    case "mock":
      return new MockProvider();
    default:
      throw new Error(`Unknown meeting bot provider: ${provider}`);
  }
}

export type { MeetingBotProvider } from "./types";
