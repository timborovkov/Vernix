export interface JoinOptions {
  silent?: boolean;
}

export interface MeetingBotProvider {
  joinMeeting(
    joinLink: string,
    meetingId: string,
    userName?: string,
    options?: JoinOptions
  ): Promise<{ botId: string; voiceSecret?: string }>;
  leaveMeeting(botId: string): Promise<void>;
  sendChatMessage(botId: string, message: string): Promise<void>;
  onTranscript(
    botId: string,
    callback: (text: string, speaker: string, timestampMs: number) => void
  ): void;
}
