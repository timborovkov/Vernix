const { mockQdrantClient, mockCreateEmbeddings } = vi.hoisted(() => ({
  mockQdrantClient: {
    getCollection: vi.fn(),
    createCollection: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
  mockCreateEmbeddings: vi
    .fn()
    .mockResolvedValue([new Array(1536).fill(0.1), new Array(1536).fill(0.2)]),
}));

vi.mock("./client", () => ({
  getQdrantClient: () => mockQdrantClient,
}));
vi.mock("@/lib/openai/embeddings", () => ({
  createEmbeddings: mockCreateEmbeddings,
}));

import {
  knowledgeCollectionName,
  ensureKnowledgeCollection,
  upsertDocumentChunks,
  deleteDocumentChunks,
} from "./knowledge";

const USER_ID = "b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22";

describe("knowledgeCollectionName", () => {
  it("returns collection name with dashes removed", () => {
    expect(knowledgeCollectionName(USER_ID)).toBe(
      "knowledge_b1ffcd001a2b4ef8bb6d7cc0ce491b22"
    );
  });
});

describe("ensureKnowledgeCollection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("skips creation if collection already exists", async () => {
    mockQdrantClient.getCollection.mockResolvedValueOnce({});

    const name = await ensureKnowledgeCollection(USER_ID);

    expect(name).toBe("knowledge_b1ffcd001a2b4ef8bb6d7cc0ce491b22");
    expect(mockQdrantClient.getCollection).toHaveBeenCalledWith(name);
    expect(mockQdrantClient.createCollection).not.toHaveBeenCalled();
  });

  it("creates collection if it does not exist", async () => {
    mockQdrantClient.getCollection.mockRejectedValueOnce(
      new Error("Not found")
    );

    const name = await ensureKnowledgeCollection(USER_ID);

    expect(mockQdrantClient.createCollection).toHaveBeenCalledWith(name, {
      vectors: { size: 1536, distance: "Cosine" },
    });
  });
});

describe("upsertDocumentChunks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty array for empty chunks", async () => {
    const ids = await upsertDocumentChunks("coll", []);
    expect(ids).toEqual([]);
    expect(mockCreateEmbeddings).not.toHaveBeenCalled();
  });

  it("batch embeds and upserts chunks with correct payload", async () => {
    const chunks = [
      {
        text: "chunk one",
        documentId: "doc-1",
        fileName: "test.pdf",
        chunkIndex: 0,
      },
      {
        text: "chunk two",
        documentId: "doc-1",
        fileName: "test.pdf",
        chunkIndex: 1,
      },
    ];

    const ids = await upsertDocumentChunks("knowledge_abc", chunks);

    expect(ids).toHaveLength(2);
    expect(mockCreateEmbeddings).toHaveBeenCalledWith([
      "chunk one",
      "chunk two",
    ]);
    expect(mockQdrantClient.upsert).toHaveBeenCalledWith("knowledge_abc", {
      points: expect.arrayContaining([
        expect.objectContaining({
          payload: {
            text: "chunk one",
            type: "document",
            document_id: "doc-1",
            file_name: "test.pdf",
            chunk_index: 0,
          },
        }),
      ]),
    });
  });
});

describe("deleteDocumentChunks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes by document_id filter", async () => {
    await deleteDocumentChunks("knowledge_abc", "doc-1");

    expect(mockQdrantClient.delete).toHaveBeenCalledWith("knowledge_abc", {
      filter: {
        must: [{ key: "document_id", match: { value: "doc-1" } }],
      },
    });
  });
});
