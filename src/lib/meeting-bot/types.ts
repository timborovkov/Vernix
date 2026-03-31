export interface JoinOptions {
  silent?: boolean;
}

export interface RecallMediaShortcut {
  data?: {
    download_url?: string;
  };
}

export interface RecallBot {
  id: string;
  status_changes: Array<{
    code: string;
    sub_code?: string;
    created_at: string;
  }>;
  recordings: Array<{ id: string }>;
  media_shortcuts: {
    video_mixed?: RecallMediaShortcut;
    transcript?: RecallMediaShortcut;
    participant_events?: RecallMediaShortcut;
    meeting_metadata?: RecallMediaShortcut;
  };
}

export interface RecallParticipantEvent {
  id: number;
  name: string | null;
  is_host: boolean;
  email: string | null;
  platform: string | null;
  events: Array<{ type: string; timestamp: string }>;
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
  getBot?(botId: string): Promise<RecallBot>;
  getParticipantEvents?(recordingId: string): Promise<RecallParticipantEvent[]>;
  deleteBot?(botId: string): Promise<void>;
}
