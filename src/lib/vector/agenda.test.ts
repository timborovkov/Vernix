const { mockQdrantClient, mockCreateEmbeddings } = vi.hoisted(() => ({
  mockQdrantClient: {
    delete: vi.fn().mockResolvedValue(undefined),
    upsert: vi.fn().mockResolvedValue(undefined),
  },
  mockCreateEmbeddings: vi.fn().mockResolvedValue([new Array(1536).fill(0.1)]),
}));

vi.mock("./client", () => ({
  getQdrantClient: () => mockQdrantClient,
}));
vi.mock("@/lib/openai/embeddings", () => ({
  createEmbeddings: mockCreateEmbeddings,
}));
vi.mock("@/lib/knowledge/chunk", () => ({
  chunkText: vi.fn().mockReturnValue([{ text: "agenda chunk", index: 0 }]),
}));

import { upsertAgenda } from "./agenda";

describe("upsertAgenda", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes existing agenda and batch upserts new one", async () => {
    await upsertAgenda("meeting_abc", "Discuss roadmap");

    expect(mockQdrantClient.delete).toHaveBeenCalledWith("meeting_abc", {
      filter: { must: [{ key: "type", match: { value: "agenda" } }] },
    });
    expect(mockCreateEmbeddings).toHaveBeenCalledWith(["agenda chunk"]);
    expect(mockQdrantClient.upsert).toHaveBeenCalledWith(
      "meeting_abc",
      expect.objectContaining({
        points: [
          expect.objectContaining({
            payload: {
              text: "agenda chunk",
              type: "agenda",
              speaker: "Agenda",
              timestamp_ms: 0,
            },
          }),
        ],
      })
    );
  });

  it("only deletes when agenda is empty", async () => {
    await upsertAgenda("meeting_abc", "   ");

    expect(mockQdrantClient.delete).toHaveBeenCalled();
    expect(mockCreateEmbeddings).not.toHaveBeenCalled();
    expect(mockQdrantClient.upsert).not.toHaveBeenCalled();
  });
});
