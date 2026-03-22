import { OpenAIRealtimeWebSocket } from "openai/realtime/websocket";
import { getOpenAIClient } from "./client";
import { getRAGContext, formatContextForPrompt } from "@/lib/agent/rag";
import { AGENT_SYSTEM_PROMPT } from "@/lib/agent/prompts";

export interface VoiceSessionConfig {
  meetingId: string;
  model?: string;
}

export type VoiceEvent =
  | { type: "connected" }
  | { type: "audio_delta"; delta: string }
  | { type: "text_delta"; delta: string }
  | { type: "text_done"; text: string }
  | { type: "error"; message: string }
  | { type: "closed" };

export type VoiceEventHandler = (event: VoiceEvent) => void;

export class VoiceSession {
  private rt: OpenAIRealtimeWebSocket | null = null;
  private config: VoiceSessionConfig;
  private handlers: VoiceEventHandler[] = [];

  constructor(config: VoiceSessionConfig) {
    this.config = config;
  }

  on(handler: VoiceEventHandler): void {
    this.handlers.push(handler);
  }

  async connect(): Promise<void> {
    if (this.rt) {
      this.rt.close();
      this.rt = null;
    }

    const client = getOpenAIClient();
    this.rt = await OpenAIRealtimeWebSocket.create(client, {
      model: this.config.model ?? "gpt-4o-realtime-preview",
    });

    this.rt.on("session.created", () => {
      this.rt?.send({
        type: "session.update",
        session: {
          type: "realtime",
          instructions: AGENT_SYSTEM_PROMPT,
          tools: [
            {
              type: "function",
              name: "search_meeting_context",
              description:
                "Search current and past meeting transcripts for relevant context.",
              parameters: {
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description: "Search query",
                  },
                },
                required: ["query"],
              },
            },
          ],
          tool_choice: "auto",
        },
      });
    });

    this.rt.on("session.updated", () => {
      this.emit({ type: "connected" });
    });

    this.rt.on("response.output_audio.delta", (event) => {
      this.emit({ type: "audio_delta", delta: event.delta });
    });

    this.rt.on("response.output_text.delta", (event) => {
      this.emit({ type: "text_delta", delta: event.delta });
    });

    this.rt.on("response.output_text.done", (event) => {
      this.emit({ type: "text_done", text: event.text });
    });

    this.rt.on("response.function_call_arguments.done", async (event) => {
      const originRt = this.rt;

      let output: string;
      try {
        const args = JSON.parse(event.arguments) as { query: string };
        const results = await getRAGContext(args.query, {
          boostMeetingId: this.config.meetingId,
        });
        output =
          formatContextForPrompt(results) || "No relevant context found.";
      } catch {
        output = "Error searching meeting context.";
      }

      // Drop response if connection changed or closed during await
      if (!this.rt || this.rt !== originRt) return;

      this.rt.send({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: event.call_id,
          output,
        },
      });
      this.rt.send({ type: "response.create" });
    });

    this.rt.on("error", (error) => {
      this.emit({ type: "error", message: error.message });
    });
  }

  sendAudio(base64Audio: string): void {
    this.rt?.send({ type: "input_audio_buffer.append", audio: base64Audio });
  }

  sendText(text: string): void {
    this.rt?.send({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text }],
      },
    });
    this.rt?.send({ type: "response.create" });
  }

  close(): void {
    this.rt?.close();
    this.rt = null;
    this.emit({ type: "closed" });
  }

  private emit(event: VoiceEvent): void {
    for (const handler of this.handlers) {
      handler(event);
    }
  }
}
