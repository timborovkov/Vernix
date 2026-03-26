const { mockChatCreate } = vi.hoisted(() => ({
  mockChatCreate: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            items: [
              { title: "Review proposal", assignee: "Alice" },
              { title: "Schedule follow-up", assignee: null },
            ],
          }),
        },
      },
    ],
  }),
}));

vi.mock("@/lib/openai/client", () => ({
  getOpenAIClient: () => ({
    chat: { completions: { create: mockChatCreate } },
  }),
}));

import { extractActionItems } from "./extract";

describe("extractActionItems", () => {
  beforeEach(() => mockChatCreate.mockClear());

  it("returns empty array for empty segments", async () => {
    const result = await extractActionItems([]);
    expect(result).toEqual([]);
    expect(mockChatCreate).not.toHaveBeenCalled();
  });

  it("extracts tasks from transcript segments", async () => {
    const segments = [
      {
        text: "We should review the proposal",
        speaker: "Alice",
        timestampMs: 1000,
      },
      {
        text: "I will schedule a follow-up",
        speaker: "Bob",
        timestampMs: 2000,
      },
    ];

    const result = await extractActionItems(segments);

    expect(result).toEqual([
      { title: "Review proposal", assignee: "Alice" },
      { title: "Schedule follow-up", assignee: null },
    ]);
    expect(mockChatCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        response_format: { type: "json_object" },
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "system",
            content: expect.stringContaining("action items"),
          }),
        ]),
      })
    );

    // Verify segments are sorted by timestamp and formatted as transcript
    const userMessage = mockChatCreate.mock.calls[0][0].messages.find(
      (m: { role: string }) => m.role === "user"
    );
    expect(userMessage.content).toBe(
      "[Alice]: We should review the proposal\n[Bob]: I will schedule a follow-up"
    );
  });

  it("handles malformed LLM response gracefully", async () => {
    mockChatCreate.mockResolvedValueOnce({
      choices: [{ message: { content: "not valid json" } }],
    });

    const result = await extractActionItems([
      { text: "test", speaker: "A", timestampMs: 0 },
    ]);

    expect(result).toEqual([]);
  });

  it("handles missing items array", async () => {
    mockChatCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ foo: "bar" }) } }],
    });

    const result = await extractActionItems([
      { text: "test", speaker: "A", timestampMs: 0 },
    ]);

    expect(result).toEqual([]);
  });

  it("limits to 50 items", async () => {
    const items = Array.from({ length: 60 }, (_, i) => ({
      title: `Task ${i}`,
      assignee: null,
    }));
    mockChatCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ items }) } }],
    });

    const result = await extractActionItems([
      { text: "test", speaker: "A", timestampMs: 0 },
    ]);

    expect(result).toHaveLength(50);
  });
});
