import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockGetRAGContext } = vi.hoisted(() => ({
  mockGetRAGContext: vi.fn(),
}));

vi.mock("@/lib/agent/rag", async () => {
  class MeetingNotFoundError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "MeetingNotFoundError";
    }
  }
  class EmbeddingError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "EmbeddingError";
    }
  }
  class AllSearchesFailedError extends Error {
    constructor() {
      super("Vector search failed for all collections");
      this.name = "AllSearchesFailedError";
    }
  }
  return {
    getRAGContext: mockGetRAGContext,
    MeetingNotFoundError,
    EmbeddingError,
    AllSearchesFailedError,
  };
});

import { canMakeRagQuery } from "@/lib/billing/limits";
import { recordUsageEvent } from "@/lib/billing/usage";
import {
  MeetingNotFoundError,
  EmbeddingError,
  AllSearchesFailedError,
} from "@/lib/agent/rag";

const USER_ID = "b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

import { searchMeetings } from "./search";

describe("searchMeetings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws BillingError when RAG quota exceeded", async () => {
    vi.mocked(canMakeRagQuery).mockReturnValueOnce({
      allowed: false,
      reason: "Daily RAG query limit reached",
    });

    await expect(searchMeetings(USER_ID, { query: "test" })).rejects.toThrow(
      "Daily RAG query limit reached"
    );
  });

  it("throws BillingError with 429 status code", async () => {
    vi.mocked(canMakeRagQuery).mockReturnValueOnce({
      allowed: false,
      reason: "Limit exceeded",
    });

    try {
      await searchMeetings(USER_ID, { query: "test" });
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect((error as { statusCode: number }).statusCode).toBe(429);
    }
  });

  it("translates MeetingNotFoundError to NotFoundError", async () => {
    mockGetRAGContext.mockRejectedValueOnce(
      new MeetingNotFoundError("Meeting xyz not found")
    );

    await expect(
      searchMeetings(USER_ID, { query: "test", meetingId: "xyz" })
    ).rejects.toThrow("Meeting not found");
  });

  it("translates EmbeddingError to generic Error", async () => {
    mockGetRAGContext.mockRejectedValueOnce(
      new EmbeddingError("OpenAI embedding failed")
    );

    await expect(searchMeetings(USER_ID, { query: "test" })).rejects.toThrow(
      "Failed to create embedding"
    );
  });

  it("translates AllSearchesFailedError to generic Error", async () => {
    mockGetRAGContext.mockRejectedValueOnce(new AllSearchesFailedError());

    await expect(searchMeetings(USER_ID, { query: "test" })).rejects.toThrow(
      "Vector search failed for all collections"
    );
  });

  it("re-throws unknown errors as-is", async () => {
    mockGetRAGContext.mockRejectedValueOnce(new Error("Unexpected boom"));

    await expect(searchMeetings(USER_ID, { query: "test" })).rejects.toThrow(
      "Unexpected boom"
    );
  });

  it("records usage event on success", async () => {
    mockGetRAGContext.mockResolvedValueOnce([]);

    await searchMeetings(USER_ID, { query: "test" });

    expect(recordUsageEvent).toHaveBeenCalledWith(USER_ID, "rag_query");
  });

  it("maps RAG results to expected output format", async () => {
    mockGetRAGContext.mockResolvedValueOnce([
      {
        text: "Hello world",
        score: 0.95,
        source: "transcript",
        speaker: "Alice",
        timestampMs: 1234,
        meetingId: "m1",
        fileName: null,
        documentId: null,
      },
    ]);

    const results = await searchMeetings(USER_ID, { query: "hello" });

    expect(results).toEqual([
      {
        text: "Hello world",
        score: 0.95,
        source: "transcript",
        speaker: "Alice",
        timestamp_ms: 1234, // renamed from timestampMs
        meetingId: "m1",
        fileName: null,
        documentId: null,
      },
    ]);
  });

  it("passes userId to getRAGContext for cross-user isolation", async () => {
    mockGetRAGContext.mockResolvedValueOnce([]);

    await searchMeetings(USER_ID, {
      query: "test",
      meetingId: "m1",
      limit: 5,
    });

    expect(mockGetRAGContext).toHaveBeenCalledWith("test", {
      meetingId: "m1",
      limit: 5,
      userId: USER_ID,
    });
  });

  it("defaults limit to 10", async () => {
    mockGetRAGContext.mockResolvedValueOnce([]);

    await searchMeetings(USER_ID, { query: "test" });

    expect(mockGetRAGContext).toHaveBeenCalledWith("test", {
      meetingId: undefined,
      limit: 10,
      userId: USER_ID,
    });
  });
});
