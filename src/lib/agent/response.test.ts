import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateAgentResponse } from "./response";

// Mock dependencies
vi.mock("@/lib/openai/client", () => ({
  getOpenAIClient: vi.fn().mockReturnValue({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: "Test response." } }],
        }),
      },
    },
  }),
}));

vi.mock("@/lib/agent/rag", () => ({
  getRAGContext: vi.fn().mockResolvedValue([]),
  formatContextForPrompt: vi.fn().mockReturnValue(""),
}));

vi.mock("@/lib/mcp/client", () => ({
  McpClientManager: {
    connectForUser: vi.fn().mockResolvedValue({
      getOpenAITools: vi.fn().mockReturnValue([]),
      callTool: vi.fn().mockResolvedValue({}),
    }),
  },
}));

vi.mock("@/lib/agent/prompts", () => ({
  getSilentAgentSystemPrompt: vi.fn().mockReturnValue("system prompt"),
}));

describe("generateAgentResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns text response from LLM", async () => {
    const result = await generateAgentResponse(
      "meeting-1",
      "user-1",
      "Hey Vernix, what was discussed?"
    );

    expect(result.text).toBe("Test response.");
    expect(result.leave).toBe(false);
    expect(result.mute).toBe(false);
  });

  it("handles RAG failure gracefully", async () => {
    const { getRAGContext } = await import("@/lib/agent/rag");
    vi.mocked(getRAGContext).mockRejectedValueOnce(new Error("RAG error"));

    const result = await generateAgentResponse(
      "meeting-1",
      "user-1",
      "Hey Vernix, help me"
    );

    expect(result.text).toBe("Test response.");
    expect(result.leave).toBe(false);
    expect(result.mute).toBe(false);
  });

  it("handles MCP connection failure gracefully", async () => {
    const { McpClientManager } = await import("@/lib/mcp/client");
    vi.mocked(McpClientManager.connectForUser).mockRejectedValueOnce(
      new Error("MCP error")
    );

    const result = await generateAgentResponse(
      "meeting-1",
      "user-1",
      "Hey Vernix, help me"
    );

    expect(result.text).toBe("Test response.");
    expect(result.leave).toBe(false);
    expect(result.mute).toBe(false);
  });

  it("detects leave_meeting tool call", async () => {
    const { getOpenAIClient } = await import("@/lib/openai/client");
    const mockCreate = vi.mocked(
      getOpenAIClient().chat.completions.create
    ) as ReturnType<typeof vi.fn>;

    // First call returns a tool call, second returns follow-up text
    mockCreate
      .mockResolvedValueOnce({
        choices: [
          {
            finish_reason: "tool_calls",
            message: {
              content: null,
              tool_calls: [
                {
                  id: "call_1",
                  type: "function",
                  function: {
                    name: "leave_meeting",
                    arguments: "{}",
                  },
                },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: "Goodbye, leaving now." } }],
      });

    const result = await generateAgentResponse(
      "meeting-1",
      "user-1",
      "Vernix please leave"
    );

    expect(result.leave).toBe(true);
    expect(result.mute).toBeFalsy();
    expect(result.text).toBe("Goodbye, leaving now.");
  });

  it("detects mute_self tool call", async () => {
    const { getOpenAIClient } = await import("@/lib/openai/client");
    const mockCreate = vi.mocked(
      getOpenAIClient().chat.completions.create
    ) as ReturnType<typeof vi.fn>;

    mockCreate
      .mockResolvedValueOnce({
        choices: [
          {
            finish_reason: "tool_calls",
            message: {
              content: null,
              tool_calls: [
                {
                  id: "call_2",
                  type: "function",
                  function: {
                    name: "mute_self",
                    arguments: "{}",
                  },
                },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: "Muting myself now." } }],
      });

    const result = await generateAgentResponse(
      "meeting-1",
      "user-1",
      "Vernix be quiet"
    );

    expect(result.mute).toBe(true);
    expect(result.leave).toBeFalsy();
    expect(result.text).toBe("Muting myself now.");
  });

  it("truncates response to 500 chars", async () => {
    const { getOpenAIClient } = await import("@/lib/openai/client");
    const mockCreate = vi.mocked(
      getOpenAIClient().chat.completions.create
    ) as ReturnType<typeof vi.fn>;

    const longResponse = "A".repeat(600);
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: longResponse } }],
    });

    const result = await generateAgentResponse(
      "meeting-1",
      "user-1",
      "Vernix give me a long answer"
    );

    expect(result.text.length).toBe(500);
  });
});
