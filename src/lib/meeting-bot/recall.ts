import type { MeetingBotProvider } from "./types";

export class RecallProvider implements MeetingBotProvider {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    this.apiKey = process.env.RECALL_API_KEY ?? "";
    this.apiUrl = process.env.RECALL_API_URL ?? "https://api.recall.ai/api/v1";
  }

  async joinMeeting(
    joinLink: string,
    meetingId: string
  ): Promise<{ botId: string }> {
    const response = await fetch(`${this.apiUrl}/bot`, {
      method: "POST",
      headers: {
        Authorization: `Token ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        meeting_url: joinLink,
        bot_name: `KiviKova Agent`,
        transcription_options: { provider: "default" },
        real_time_transcription: {
          destination_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/webhooks/recall/transcript`,
          partial_results: false,
        },
        metadata: { meetingId },
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Recall API error: ${response.status} ${await response.text()}`
      );
    }

    const data = (await response.json()) as { id: string };
    return { botId: data.id };
  }

  async leaveMeeting(botId: string): Promise<void> {
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
