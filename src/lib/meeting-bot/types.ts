export interface MeetingBotProvider {
  joinMeeting(joinLink: string, meetingId: string): Promise<{ botId: string }>;
  leaveMeeting(botId: string): Promise<void>;
  onTranscript(
    botId: string,
    callback: (text: string, speaker: string, timestampMs: number) => void
  ): void;
}
