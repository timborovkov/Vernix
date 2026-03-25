import { randomUUID } from "crypto";
import type { JoinOptions, MeetingBotProvider } from "./types";

export class RecallProvider implements MeetingBotProvider {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    this.apiKey = process.env.RECALL_API_KEY ?? "";
    this.apiUrl =
      process.env.RECALL_API_URL ?? "https://eu-central-1.recall.ai/api/v1";
  }

  async joinMeeting(
    joinLink: string,
    meetingId: string,
    userName?: string,
    options?: JoinOptions
  ): Promise<{ botId: string; voiceSecret?: string }> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const silent = options?.silent ?? false;
    const voiceSecret = silent ? undefined : randomUUID();

    const botConfig: Record<string, unknown> = {
      meeting_url: joinLink,
      bot_name: userName ? `${userName}'s Vernix Agent` : "Vernix Agent",
      variant: {
        zoom: "web_4_core",
        google_meet: "web_4_core",
        microsoft_teams: "web_4_core",
      },
      recording_config: {
        transcript: {
          provider: { recallai_streaming: {} },
          diarization: { use_separate_streams_when_available: true },
        },
        include_bot_in_recording: { audio: !silent },
        realtime_endpoints: [
          {
            type: "webhook",
            url: `${appUrl}/api/webhooks/recall/transcript`,
            events: ["transcript.data"],
          },
        ],
      },
      metadata: { meetingId },
    };

    if (!silent) {
      botConfig.output_media = {
        camera: {
          kind: "webpage",
          config: {
            url: `${appUrl}/voice-agent.html?meetingId=${meetingId}&botSecret=${voiceSecret}&appUrl=${encodeURIComponent(appUrl)}`,
          },
        },
      };
    }

    const logSafe = {
      ...botConfig,
      output_media: silent ? undefined : "[redacted]",
    };
    console.log(
      `[RecallProvider] Creating ${silent ? "silent" : "voice"} bot with config:`,
      JSON.stringify(logSafe, null, 2)
    );

    const response = await fetch(`${this.apiUrl}/bot`, {
      method: "POST",
      headers: {
        Authorization: `Token ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(botConfig),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.log(
        `[RecallProvider] Recall API error (${response.status}):`,
        responseText
      );
      throw new Error(`Recall API error: ${response.status} ${responseText}`);
    }

    const data = JSON.parse(responseText) as { id: string };
    console.log(`[RecallProvider] Bot created: ${data.id}`);
    return { botId: data.id, voiceSecret };
  }

  async leaveMeeting(botId: string): Promise<void> {
    console.log(`[RecallProvider] Leaving meeting, botId: ${botId}`);

    const response = await fetch(`${this.apiUrl}/bot/${botId}/leave_call`, {
      method: "POST",
      headers: {
        Authorization: `Token ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Recall API error: ${response.status} ${await response.text()}`
      );
    }
  }

  async sendChatMessage(botId: string, message: string): Promise<void> {
    console.log(`[RecallProvider] Sending chat message, botId: ${botId}`);

    const response = await fetch(
      `${this.apiUrl}/bot/${botId}/send_chat_message`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Recall chat API error: ${response.status} ${await response.text()}`
      );
    }
  }

  onTranscript(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    botId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    callback: (text: string, speaker: string, timestampMs: number) => void
  ): void {
    // Recall.ai sends transcripts via webhook — this is a no-op
  }
}
