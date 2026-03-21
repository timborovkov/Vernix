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

import { GET } from "./route";
import { parseJsonResponse, fakeMeeting } from "@/test/helpers";

function searchRequest(params: string) {
  return new Request(`http://localhost/api/search${params}`);
}

describe("GET /api/search", () => {
  it("returns 400 when q is missing", async () => {
    const { status } = await parseJsonResponse(await GET(searchRequest("")));
    expect(status).toBe(400);
  });

  it("returns 400 when meetingId is invalid UUID", async () => {
    const { status } = await parseJsonResponse(
      await GET(searchRequest("?q=test&meetingId=bad"))
    );
    expect(status).toBe(400);
  });

  it("returns 404 when specified meetingId not found", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    const { status } = await parseJsonResponse(
      await GET(
        searchRequest("?q=test&meetingId=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11")
      )
    );
    expect(status).toBe(404);
  });

  it("searches correct collection when meetingId provided", async () => {
    const meeting = fakeMeeting({
      qdrantCollectionName: "meeting_xyz",
      status: "active",
    });
    mockDb.where.mockResolvedValueOnce([meeting]);
    mockQdrantClient.search.mockResolvedValueOnce([
      {
        id: "pt-1",
        score: 0.95,
        payload: {
          text: "Hello",
          speaker: "Alice",
          timestamp_ms: 1000,
        },
      },
    ]);

    const { status, data } = await parseJsonResponse(
      await GET(searchRequest(`?q=hello&meetingId=${meeting.id}`))
    );

    expect(status).toBe(200);
    expect(mockQdrantClient.search).toHaveBeenCalledWith(
      "meeting_xyz",
      expect.objectContaining({ vector: expect.any(Array), limit: 10 })
    );
    expect(data.results).toHaveLength(1);
    expect(data.results[0].text).toBe("Hello");
    expect(data.results[0].meetingId).toBe(meeting.id);
  });

  it("searches all active/completed meetings when no meetingId", async () => {
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
    mockQdrantClient.search
      .mockResolvedValueOnce([
        {
          id: "p1",
          score: 0.8,
          payload: { text: "A", speaker: "X", timestamp_ms: 100 },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "p2",
          score: 0.9,
          payload: { text: "B", speaker: "Y", timestamp_ms: 200 },
        },
      ]);

    const { data } = await parseJsonResponse(
      await GET(searchRequest("?q=test"))
    );

    expect(mockQdrantClient.search).toHaveBeenCalledTimes(2);
    expect(data.results).toHaveLength(2);
  });

  it("merges and sorts cross-meeting results by score desc", async () => {
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
      .mockResolvedValueOnce([
        {
          id: "p1",
          score: 0.7,
          payload: { text: "Low", speaker: "A", timestamp_ms: 100 },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "p2",
          score: 0.95,
          payload: { text: "High", speaker: "B", timestamp_ms: 200 },
        },
      ]);

    const { data } = await parseJsonResponse(
      await GET(searchRequest("?q=test"))
    );

    expect(data.results[0].score).toBe(0.95);
    expect(data.results[1].score).toBe(0.7);
  });

  it("respects limit parameter", async () => {
    const meeting = fakeMeeting({ qdrantCollectionName: "coll_1" });
    mockDb.where.mockResolvedValueOnce([meeting]);
    mockQdrantClient.search.mockResolvedValueOnce([]);

    await GET(searchRequest(`?q=test&meetingId=${meeting.id}&limit=5`));

    expect(mockQdrantClient.search).toHaveBeenCalledWith(
      "coll_1",
      expect.objectContaining({ limit: 5 })
    );
  });

  it("returns 500 when embedding fails", async () => {
    const meeting = fakeMeeting({ qdrantCollectionName: "coll_1" });
    mockDb.where.mockResolvedValueOnce([meeting]);
    mockCreateEmbedding.mockRejectedValueOnce(new Error("OpenAI down"));

    const { status, data } = await parseJsonResponse(
      await GET(searchRequest(`?q=test&meetingId=${meeting.id}`))
    );

    expect(status).toBe(500);
    expect(data.error).toMatch(/embedding/i);
  });

  it("returns 500 when all collection searches fail", async () => {
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

    const { status, data } = await parseJsonResponse(
      await GET(searchRequest("?q=test"))
    );

    expect(status).toBe(500);
    expect(data.error).toMatch(/failed/i);
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

    const { status, data } = await parseJsonResponse(
      await GET(searchRequest("?q=test"))
    );

    expect(status).toBe(200);
    expect(data.results).toHaveLength(1);
    expect(data.results[0].text).toBe("OK");
  });

  it("returns empty results array when no matches", async () => {
    mockDb.where.mockResolvedValueOnce([
      fakeMeeting({ qdrantCollectionName: "coll_1" }),
    ]);
    mockQdrantClient.search.mockResolvedValueOnce([]);

    const { data } = await parseJsonResponse(
      await GET(searchRequest("?q=test"))
    );

    expect(data.results).toEqual([]);
  });
});
