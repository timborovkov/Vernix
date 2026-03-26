const { mockDb } = vi.hoisted(() => {
  const db: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of [
    "select",
    "from",
    "where",
    "orderBy",
    "insert",
    "values",
    "returning",
    "update",
    "set",
    "delete",
  ]) {
    db[m] = vi.fn().mockImplementation(() => db);
  }
  return { mockDb: db };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/agent/telemetry", () => ({
  recordActivation: vi.fn(),
}));

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  containsVoiceMention,
  handleVoiceTranscript,
  resetVoiceBuffers,
} from "./activation";
import { resetRateLimits } from "@/lib/rate-limit";

describe("containsVoiceMention", () => {
  it("returns true for 'vernix' (case-insensitive)", () => {
    expect(containsVoiceMention("Hey Vernix, what was discussed?")).toBe(true);
    expect(containsVoiceMention("VERNIX help me")).toBe(true);
    expect(containsVoiceMention("ask vernix")).toBe(true);
  });

  it("returns true for 'agent' (case-insensitive)", () => {
    expect(containsVoiceMention("Hey agent, help me")).toBe(true);
    expect(containsVoiceMention("AGENT please")).toBe(true);
  });

  it("returns true for 'assistant' (case-insensitive)", () => {
    expect(containsVoiceMention("ask the assistant")).toBe(true);
    expect(containsVoiceMention("ASSISTANT, what do you think?")).toBe(true);
  });

  it("returns false for unrelated text", () => {
    expect(containsVoiceMention("let us discuss the agenda")).toBe(false);
    expect(containsVoiceMention("I will review the notes")).toBe(false);
    expect(containsVoiceMention("hello everyone")).toBe(false);
    expect(containsVoiceMention("")).toBe(false);
  });
});

describe("handleVoiceTranscript", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetVoiceBuffers();
    resetRateLimits();

    // Default: DB select returns a meeting with idle state
    mockDb.where.mockResolvedValue([
      { metadata: { voiceActivation: { state: "idle" } } },
    ]);
    // DB update resolves successfully
    mockDb.set.mockImplementation(() => mockDb);
  });

  afterEach(() => {
    vi.useRealTimers();
    resetVoiceBuffers();
    resetRateLimits();
  });

  it("buffers transcript chunks and fires after debounce", async () => {
    handleVoiceTranscript(
      "meeting-1",
      "user-1",
      "bot-1",
      "Alice",
      "Hey Vernix",
      1000
    );

    // Should not have fired yet — update not called
    expect(mockDb.update).not.toHaveBeenCalled();

    // Fast-forward debounce timer
    await vi.runAllTimersAsync();

    // Should have called update to set activation state
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("does not activate when no mention detected", async () => {
    handleVoiceTranscript(
      "meeting-2",
      "user-1",
      "bot-2",
      "Alice",
      "Let us review the agenda",
      1000
    );

    await vi.runAllTimersAsync();

    // Update should not be called since no trigger keyword was found
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("rate limits activations (1 per 15s)", async () => {
    // First mention — should activate
    handleVoiceTranscript(
      "meeting-3",
      "user-1",
      "bot-3",
      "Alice",
      "Vernix help",
      1000
    );
    await vi.runAllTimersAsync();
    expect(mockDb.update).toHaveBeenCalled();

    mockDb.update.mockClear();
    mockDb.set.mockClear();
    mockDb.set.mockImplementation(() => mockDb);

    // Second mention immediately — should be rate-limited
    handleVoiceTranscript(
      "meeting-3",
      "user-1",
      "bot-3",
      "Bob",
      "Vernix answer",
      2000
    );
    await vi.runAllTimersAsync();
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("resets debounce timer when new chunks arrive", async () => {
    handleVoiceTranscript(
      "meeting-4",
      "user-1",
      "bot-4",
      "Alice",
      "Vernix",
      1000
    );

    // Advance 200ms (not yet 500ms debounce)
    vi.advanceTimersByTime(200);
    expect(mockDb.update).not.toHaveBeenCalled();

    // New chunk arrives — timer resets
    handleVoiceTranscript(
      "meeting-4",
      "user-1",
      "bot-4",
      "Alice",
      "what is the summary?",
      2000
    );

    // Advance past debounce — should fire now
    await vi.runAllTimersAsync();
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("does not activate if already responding", async () => {
    // DB returns a meeting with "responding" state
    mockDb.where.mockResolvedValue([
      { metadata: { voiceActivation: { state: "responding" } } },
    ]);

    handleVoiceTranscript(
      "meeting-5",
      "user-1",
      "bot-5",
      "Alice",
      "Hey Vernix",
      1000
    );

    await vi.runAllTimersAsync();

    // select is called to check state, but update should not be called
    expect(mockDb.update).not.toHaveBeenCalled();
  });
});
