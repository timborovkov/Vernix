import type { MeetingBotProvider } from "./types";

export class MockProvider implements MeetingBotProvider {
  async joinMeeting(
    _joinLink: string,
    meetingId: string
  ): Promise<{ botId: string }> {
    console.log(`[MockBot] Joining meeting ${meetingId}`);
    return { botId: `mock-bot-${meetingId}` };
  }

  async leaveMeeting(botId: string): Promise<void> {
    console.log(`[MockBot] Leaving meeting ${botId}`);
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
}
