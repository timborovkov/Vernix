import { randomUUID } from "crypto";
import type { JoinOptions, MeetingBotProvider } from "./types";

export class MockProvider implements MeetingBotProvider {
  async joinMeeting(
    _joinLink: string,
    meetingId: string,
    _userName?: string,
    options?: JoinOptions
  ): Promise<{ botId: string; voiceSecret?: string }> {
    const silent = options?.silent ?? false;
    console.log(`[MockBot] Joining meeting ${meetingId} (silent=${silent})`);
    return {
      botId: `mock-bot-${meetingId}`,
      voiceSecret: silent ? undefined : randomUUID(),
    };
  }

  async leaveMeeting(botId: string): Promise<void> {
    console.log(`[MockBot] Leaving meeting ${botId}`);
  }

  async sendChatMessage(botId: string, message: string): Promise<void> {
    console.log(`[MockBot] Chat message for bot ${botId}: ${message}`);
  }

  onTranscript(
    botId: string,
    callback: (text: string, speaker: string, timestampMs: number) => void
  ): void {
    console.log(`[MockBot] Listening for transcripts on ${botId}`);
    // Simulate a transcript after 2 seconds
    setTimeout(() => {
      callback("Hello, this is a mock transcript.", "Mock Speaker", Date.now());
    }, 2000);
  }

  async deleteBot(botId: string): Promise<void> {
    console.log(`[MockBot] Deleting bot ${botId}`);
  }
}
