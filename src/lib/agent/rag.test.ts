const { mockDb, mockQdrantClient, mockCreateEmbedding } = vi.hoisted(() => {
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
  return {
    mockDb: db,
    mockQdrantClient: {
      search: vi.fn().mockResolvedValue([]),
    },
    mockCreateEmbedding: vi.fn().mockResolvedValue(new Array(1536).fill(0.1)),
  };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/vector/client", () => ({
  getQdrantClient: () => mockQdrantClient,
}));
vi.mock("@/lib/openai/embeddings", () => ({
  createEmbedding: mockCreateEmbedding,
}));

import {
  getRAGContext,
  formatContextForPrompt,
  MeetingNotFoundError,
  EmbeddingError,
  AllSearchesFailedError,
} from "./rag";
import { fakeMeeting } from "@/test/helpers";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

describe("getRAGContext", () => {
  it("returns results sorted by score desc", async () => {
    const meeting = fakeMeeting({ qdrantCollectionName: "coll_1" });
    mockDb.where.mockResolvedValueOnce([meeting]);
    mockQdrantClient.search.mockResolvedValueOnce([
      {
        id: "p1",
        score: 0.7,
        payload: { text: "Low", speaker: "A", timestamp_ms: 100 },
      },
      {
        id: "p2",
        score: 0.95,
        payload: { text: "High", speaker: "B", timestamp_ms: 200 },
      },
    ]);

    const results = await getRAGContext("test", {
      meetingId: meeting.id,
      userId: TEST_USER_ID,
    });

    expect(results[0].score).toBe(0.95);
    expect(results[1].score).toBe(0.7);
  });

  it("filters results below scoreThreshold", async () => {
    const meeting = fakeMeeting({ qdrantCollectionName: "coll_1" });
    mockDb.where.mockResolvedValueOnce([meeting]);
    mockQdrantClient.search.mockResolvedValueOnce([
      {
        id: "p1",
        score: 0.3,
        payload: { text: "Low", speaker: "A", timestamp_ms: 100 },
      },
      {
        id: "p2",
        score: 0.8,
        payload: { text: "High", speaker: "B", timestamp_ms: 200 },
      },
    ]);

    const results = await getRAGContext("test", {
      meetingId: meeting.id,
      userId: TEST_USER_ID,
      scoreThreshold: 0.5,
    });

    expect(results).toHaveLength(1);
    expect(results[0].text).toBe("High");
  });

  it("respects limit parameter", async () => {
    const meeting = fakeMeeting({ qdrantCollectionName: "coll_1" });
    mockDb.where.mockResolvedValueOnce([meeting]);
    mockQdrantClient.search.mockResolvedValueOnce([
      {
        id: "p1",
        score: 0.9,
        payload: { text: "A", speaker: "X", timestamp_ms: 100 },
      },
      {
        id: "p2",
        score: 0.8,
        payload: { text: "B", speaker: "Y", timestamp_ms: 200 },
      },
      {
        id: "p3",
        score: 0.7,
        payload: { text: "C", speaker: "Z", timestamp_ms: 300 },
      },
    ]);

    const results = await getRAGContext("test", {
      meetingId: meeting.id,
      userId: TEST_USER_ID,
      limit: 2,
    });

    expect(results).toHaveLength(2);
  });

  it("scopes to single meeting when meetingId provided", async () => {
    const meeting = fakeMeeting({
      id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      qdrantCollectionName: "meeting_specific",
    });
    mockDb.where.mockResolvedValueOnce([meeting]);
    mockQdrantClient.search.mockResolvedValueOnce([]);

    await getRAGContext("test", {
      meetingId: meeting.id,
      userId: TEST_USER_ID,
    });

    expect(mockQdrantClient.search).toHaveBeenCalledWith(
      "meeting_specific",
      expect.objectContaining({ vector: expect.any(Array) })
    );
  });

  it("searches active/completed meetings when no meetingId", async () => {
    const m1 = fakeMeeting({
      id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      qdrantCollectionName: "coll_1",
      status: "active",
    });
    const m2 = fakeMeeting({
      id: "b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22",
      qdrantCollectionName: "coll_2",
      status: "completed",
    });
    mockDb.where.mockResolvedValueOnce([m1, m2]);
    mockQdrantClient.search.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await getRAGContext("test", { userId: TEST_USER_ID });

    expect(mockQdrantClient.search).toHaveBeenCalledTimes(2);
  });

  it("throws MeetingNotFoundError when meeting not found", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    await expect(
      getRAGContext("test", {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        userId: TEST_USER_ID,
      })
    ).rejects.toThrow(MeetingNotFoundError);
  });

  it("throws EmbeddingError when embedding fails", async () => {
    const meeting = fakeMeeting({ qdrantCollectionName: "coll_1" });
    mockDb.where.mockResolvedValueOnce([meeting]);
    mockCreateEmbedding.mockRejectedValueOnce(new Error("OpenAI down"));

    await expect(
      getRAGContext("test", { meetingId: meeting.id, userId: TEST_USER_ID })
    ).rejects.toThrow(EmbeddingError);
  });

  it("returns partial results when some collections fail", async () => {
    const m1 = fakeMeeting({
      id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      qdrantCollectionName: "coll_1",
    });
    const m2 = fakeMeeting({
      id: "b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22",
      qdrantCollectionName: "coll_2",
    });
    mockDb.where.mockResolvedValueOnce([m1, m2]);
    mockQdrantClient.search
      .mockRejectedValueOnce(new Error("Qdrant down"))
      .mockResolvedValueOnce([
        {
          id: "p1",
          score: 0.9,
          payload: { text: "OK", speaker: "A", timestamp_ms: 100 },
        },
      ]);

    const results = await getRAGContext("test", { userId: TEST_USER_ID });

    expect(results).toHaveLength(1);
    expect(results[0].text).toBe("OK");
  });

  it("boostMeetingId ranks boosted meeting results higher", async () => {
    const m1 = fakeMeeting({
      id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      qdrantCollectionName: "coll_1",
    });
    const m2 = fakeMeeting({
      id: "b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22",
      qdrantCollectionName: "coll_2",
    });
    mockDb.where.mockResolvedValueOnce([m1, m2]);
    // m1 result has lower raw score than m2, but m1 is the boosted meeting
    mockQdrantClient.search
      .mockResolvedValueOnce([
        {
          id: "p1",
          score: 0.85,
          payload: { text: "Current", speaker: "A", timestamp_ms: 100 },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "p2",
          score: 0.9,
          payload: { text: "Old", speaker: "B", timestamp_ms: 200 },
        },
      ]);

    const results = await getRAGContext("test", {
      userId: TEST_USER_ID,
      boostMeetingId: m1.id,
    });

    // m1 score 0.85 * 1.15 = 0.9775 > m2 score 0.9
    expect(results[0].text).toBe("Current");
    expect(results[0].meetingId).toBe(m1.id);
    expect(results[1].text).toBe("Old");
  });

  it("throws AllSearchesFailedError when all collections fail", async () => {
    const m1 = fakeMeeting({
      id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      qdrantCollectionName: "coll_1",
    });
    const m2 = fakeMeeting({
      id: "b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22",
      qdrantCollectionName: "coll_2",
    });
    mockDb.where.mockResolvedValueOnce([m1, m2]);
    mockQdrantClient.search
      .mockRejectedValueOnce(new Error("Qdrant down"))
      .mockRejectedValueOnce(new Error("Qdrant down"));

    await expect(
      getRAGContext("test", { userId: TEST_USER_ID })
    ).rejects.toThrow(AllSearchesFailedError);
  });
});

describe("formatContextForPrompt", () => {
  it("formats results with speaker and timestamp", () => {
    const result = formatContextForPrompt([
      {
        text: "Hello world",
        speaker: "Alice",
        timestampMs: 1500,
        score: 0.9,
        meetingId: "m1",
      },
    ]);

    expect(result).toContain("## Relevant meeting context");
    expect(result).toContain("[Alice] (1500ms): Hello world");
  });

  it("returns empty string for empty results", () => {
    expect(formatContextForPrompt([])).toBe("");
  });
});
