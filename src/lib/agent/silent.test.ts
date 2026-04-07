import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  containsMention,
  handleSilentTranscript,
  resetSilentBuffers,
} from "./silent";
import { resetRateLimits } from "@/lib/rate-limit";

// Mock dependencies
vi.mock("@/lib/openai/client", () => ({
  getOpenAIClient: vi.fn().mockReturnValue({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: "Hello! I can help with that." } }],
        }),
      },
    },
  }),
}));

vi.mock("@/lib/agent/rag", () => ({
  getRAGContext: vi.fn().mockResolvedValue([]),
  formatContextForPrompt: vi.fn().mockReturnValue(""),
}));

vi.mock("@/lib/meeting-bot", () => ({
  getMeetingBotProvider: vi.fn().mockReturnValue({
    sendChatMessage: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@/lib/mcp/client", () => ({
  McpClientManager: {
    connectForUser: vi.fn().mockResolvedValue({
      getOpenAITools: vi.fn().mockReturnValue([]),
      callTool: vi.fn().mockResolvedValue({}),
    }),
  },
}));

describe("containsMention", () => {
  it("returns true for 'Vernix' (case-insensitive)", () => {
    expect(containsMention("Hey Vernix, what was discussed?")).toBe(true);
    expect(containsMention("VERNIX help me")).toBe(true);
    expect(containsMention("ask vernix")).toBe(true);
  });

  it("returns true for agent and assistant wake words", () => {
    expect(containsMention("what did the agent say")).toBe(true);
    expect(containsMention("my assistant is here")).toBe(true);
  });

  it("returns false for unrelated text", () => {
    expect(containsMention("let us discuss the agenda")).toBe(false);
    expect(containsMention("")).toBe(false);
  });

  it("returns false for partial matches that are not the full keyword", () => {
    expect(containsMention("ver")).toBe(false);
    expect(containsMention("nix")).toBe(false);
  });
});

describe("handleSilentTranscript — speaker name isolation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetSilentBuffers();
    resetRateLimits();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetSilentBuffers();
    resetRateLimits();
  });

  it("does not respond when only the speaker name contains the trigger keyword", async () => {
    const { getMeetingBotProvider } = await import("@/lib/meeting-bot");
    const sendChatMessage = vi.mocked(getMeetingBotProvider().sendChatMessage);

    // Speaker display name contains "Vernix" but the spoken text does not
    const promise = handleSilentTranscript(
      "meeting-speaker",
      "user-1",
      "bot-speaker",
      "Vernix Support",
      "Let us review the agenda items",
      1000
    );

    await vi.runAllTimersAsync();
    await promise;

    expect(sendChatMessage).not.toHaveBeenCalled();
  });
});

describe("handleSilentTranscript", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetSilentBuffers();
    resetRateLimits();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetSilentBuffers();
    resetRateLimits();
  });

  it("buffers transcript chunks and fires after debounce", async () => {
    const { getMeetingBotProvider } = await import("@/lib/meeting-bot");
    const sendChatMessage = vi.mocked(getMeetingBotProvider().sendChatMessage);

    const promise = handleSilentTranscript(
      "meeting-1",
      "user-1",
      "bot-1",
      "Alice",
      "Hey Vernix",
      1000
    );

    // Should not have fired yet (sleeping)
    expect(sendChatMessage).not.toHaveBeenCalled();

    // Fast-forward debounce timer
    await vi.runAllTimersAsync();
    await promise;

    expect(sendChatMessage).toHaveBeenCalledOnce();
  });

  it("does not respond when no mention in transcript", async () => {
    const { getMeetingBotProvider } = await import("@/lib/meeting-bot");
    const sendChatMessage = vi.mocked(getMeetingBotProvider().sendChatMessage);

    const promise = handleSilentTranscript(
      "meeting-2",
      "user-1",
      "bot-2",
      "Alice",
      "Let us review the agenda",
      1000
    );

    await vi.runAllTimersAsync();
    await promise;

    expect(sendChatMessage).not.toHaveBeenCalled();
  });

  it("rate limits rapid responses to the same meeting", async () => {
    const { getMeetingBotProvider } = await import("@/lib/meeting-bot");
    const sendChatMessage = vi.mocked(getMeetingBotProvider().sendChatMessage);

    // First mention — should respond
    const p1 = handleSilentTranscript(
      "meeting-3",
      "user-1",
      "bot-3",
      "Alice",
      "Vernix help",
      1000
    );
    await vi.runAllTimersAsync();
    await p1;
    expect(sendChatMessage).toHaveBeenCalledOnce();

    sendChatMessage.mockClear();

    // Second mention immediately — should be rate-limited
    const p2 = handleSilentTranscript(
      "meeting-3",
      "user-1",
      "bot-3",
      "Bob",
      "Vernix answer",
      2000
    );
    await vi.runAllTimersAsync();
    await p2;
    expect(sendChatMessage).not.toHaveBeenCalled();
  });

  it("resets debounce timer when new chunks arrive", async () => {
    const { getMeetingBotProvider } = await import("@/lib/meeting-bot");
    const sendChatMessage = vi.mocked(getMeetingBotProvider().sendChatMessage);

    const p1 = handleSilentTranscript(
      "meeting-4",
      "user-1",
      "bot-4",
      "Alice",
      "Vernix",
      1000
    );

    // Advance 1 second (p1 still sleeping, not yet at 3s)
    await vi.advanceTimersByTimeAsync(1000);
    expect(sendChatMessage).not.toHaveBeenCalled();

    // New chunk arrives — bumps generation, p1 will bail on wake
    const p2 = handleSilentTranscript(
      "meeting-4",
      "user-1",
      "bot-4",
      "Alice",
      "what is the summary?",
      2000
    );

    // Advance remaining time for both sleeps to complete
    await vi.runAllTimersAsync();
    await Promise.all([p1, p2]);

    // p1 saw generation mismatch and bailed; p2 flushed
    expect(sendChatMessage).toHaveBeenCalledOnce();
  });
});
