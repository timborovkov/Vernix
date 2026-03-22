import { randomUUID } from "crypto";
import type { MeetingBotProvider } from "./types";

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
    meetingId: string
  ): Promise<{ botId: string; voiceSecret: string }> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const voiceSecret = randomUUID();

    const botConfig = {
      meeting_url: joinLink,
      bot_name: "KiviKova Agent",
      variant: {
        zoom: "web_4_core",
        google_meet: "web_4_core",
        microsoft_teams: "web_4_core",
      },
      output_media: {
        camera: {
          kind: "webpage",
          config: {
            url: `${appUrl}/voice-agent.html?meetingId=${meetingId}&botSecret=${voiceSecret}&appUrl=${encodeURIComponent(appUrl)}`,
          },
        },
      },
      recording_config: {
        transcript: {
          provider: { recallai_streaming: {} },
          diarization: { use_separate_streams_when_available: true },
        },
        include_bot_in_recording: { audio: true },
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

    console.log(
      "[RecallProvider] Creating bot with config:",
      JSON.stringify(botConfig, null, 2)
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
    console.log(
      `[RecallProvider] Recall API response (${response.status}):`,
      responseText
    );

    if (!response.ok) {
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

  onTranscript(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    botId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    callback: (text: string, speaker: string, timestampMs: number) => void
  ): void {
    // Recall.ai sends transcripts via webhook — this is a no-op
  }
}
