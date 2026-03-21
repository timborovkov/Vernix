const { mockClient, mockCreateEmbedding } = vi.hoisted(() => ({
  mockClient: { upsert: vi.fn().mockResolvedValue(undefined) },
  mockCreateEmbedding: vi.fn().mockResolvedValue(new Array(1536).fill(0.1)),
}));

vi.mock("@/lib/vector/client", () => ({
  getQdrantClient: () => mockClient,
}));
vi.mock("@/lib/openai/embeddings", () => ({
  createEmbedding: mockCreateEmbedding,
}));

import { upsertTranscriptChunk } from "./upsert";

describe("upsertTranscriptChunk", () => {
  const payload = { text: "Hello world", speaker: "Alice", timestampMs: 1500 };

  it("embeds text and upserts to the correct collection", async () => {
    await upsertTranscriptChunk("meeting_abc", payload);

    expect(mockCreateEmbedding).toHaveBeenCalledWith("Hello world");
    expect(mockClient.upsert).toHaveBeenCalledWith(
      "meeting_abc",
      expect.objectContaining({
        points: expect.arrayContaining([
          expect.objectContaining({
            vector: expect.any(Array),
          }),
        ]),
      })
    );
  });

  it("returns the generated point ID", async () => {
    const id = await upsertTranscriptChunk("meeting_abc", payload);
    expect(typeof id).toBe("string");
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it("includes speaker, timestamp_ms, and type in payload", async () => {
    await upsertTranscriptChunk("meeting_abc", payload);

    const call = mockClient.upsert.mock.calls[0];
    const point = call[1].points[0];
    expect(point.payload).toEqual({
      text: "Hello world",
      speaker: "Alice",
      timestamp_ms: 1500,
      type: "transcript",
    });
  });

  it("propagates embedding errors", async () => {
    mockCreateEmbedding.mockRejectedValueOnce(new Error("OpenAI down"));

    await expect(upsertTranscriptChunk("meeting_abc", payload)).rejects.toThrow(
      "OpenAI down"
    );
  });
});
