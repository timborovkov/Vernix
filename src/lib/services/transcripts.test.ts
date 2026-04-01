import { describe, it, expect, vi, beforeEach } from "vitest";
import { fakeMeeting } from "@/test/helpers";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockDb, mockScrollTranscript } = vi.hoisted(() => {
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
    "leftJoin",
    "limit",
  ]) {
    db[m] = vi.fn().mockImplementation(() => db);
  }
  return {
    mockDb: db,
    mockScrollTranscript: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/vector/scroll", () => ({
  scrollTranscript: mockScrollTranscript,
}));

const USER_ID = "b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

import { getTranscript } from "./transcripts";

describe("getTranscript", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NotFoundError when meeting does not exist", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    await expect(getTranscript(USER_ID, "nonexistent")).rejects.toThrow(
      "Meeting not found"
    );
  });

  it("throws NotFoundError for wrong userId", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    await expect(getTranscript("other-user", "some-id")).rejects.toThrow(
      "Meeting not found"
    );
  });

  it("returns segments from scrollTranscript", async () => {
    const meeting = fakeMeeting();
    mockDb.where.mockResolvedValueOnce([meeting]);

    const segments = [
      { speaker: "Alice", text: "Hello", timestamp_ms: 0 },
      { speaker: "Bob", text: "Hi there", timestamp_ms: 1500 },
    ];
    mockScrollTranscript.mockResolvedValueOnce(segments);

    const result = await getTranscript(USER_ID, meeting.id);

    expect(result).toEqual({ segments });
  });

  it("passes the meeting's qdrantCollectionName to scrollTranscript", async () => {
    const meeting = fakeMeeting({
      qdrantCollectionName: "meeting_abc123",
    });
    mockDb.where.mockResolvedValueOnce([meeting]);
    mockScrollTranscript.mockResolvedValueOnce([]);

    await getTranscript(USER_ID, meeting.id);

    expect(mockScrollTranscript).toHaveBeenCalledWith("meeting_abc123");
  });

  it("returns empty segments array when transcript is empty", async () => {
    const meeting = fakeMeeting();
    mockDb.where.mockResolvedValueOnce([meeting]);
    mockScrollTranscript.mockResolvedValueOnce([]);

    const result = await getTranscript(USER_ID, meeting.id);

    expect(result).toEqual({ segments: [] });
  });
});
