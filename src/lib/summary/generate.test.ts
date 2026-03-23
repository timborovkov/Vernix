const { mockOpenAIClient } = vi.hoisted(() => {
  const client = {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  };
  return { mockOpenAIClient: client };
});

vi.mock("@/lib/openai/client", () => ({
  getOpenAIClient: () => mockOpenAIClient,
}));

import { generateMeetingSummary } from "./generate";
import type { TranscriptPoint } from "@/lib/vector/scroll";

describe("generateMeetingSummary", () => {
  beforeEach(() => {
    mockOpenAIClient.chat.completions.create.mockReset();
  });

  it("returns fallback for empty segments without calling OpenAI", async () => {
    const result = await generateMeetingSummary([]);

    expect(result).toBe("No transcript content available.");
    expect(mockOpenAIClient.chat.completions.create).not.toHaveBeenCalled();
  });

  it("sorts segments by timestamp and calls OpenAI with correct prompt", async () => {
    const segments: TranscriptPoint[] = [
      { text: "Second point", speaker: "Bob", timestampMs: 2000 },
      { text: "First point", speaker: "Alice", timestampMs: 1000 },
    ];

    mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
      choices: [{ message: { content: "Meeting summary here." } }],
    });

    const result = await generateMeetingSummary(segments);

    expect(result).toBe("Meeting summary here.");
    expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-5.4-mini",
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: "[Alice]: First point\n[Bob]: Second point",
          }),
        ]),
      })
    );
  });

  it("returns fallback when OpenAI returns null content", async () => {
    const segments: TranscriptPoint[] = [
      { text: "Hello", speaker: "Alice", timestampMs: 1000 },
    ];

    mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
      choices: [{ message: { content: null } }],
    });

    const result = await generateMeetingSummary(segments);

    expect(result).toBe("Summary generation failed.");
  });
});
