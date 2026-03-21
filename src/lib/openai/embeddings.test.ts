const mockCreate = vi.fn();

vi.mock("@/lib/openai/client", () => ({
  getOpenAIClient: () => ({ embeddings: { create: mockCreate } }),
}));

import { createEmbedding, createEmbeddings } from "./embeddings";

describe("createEmbedding", () => {
  it("returns embedding vector from response", async () => {
    const fakeVector = [0.1, 0.2, 0.3];
    mockCreate.mockResolvedValueOnce({ data: [{ embedding: fakeVector }] });

    const result = await createEmbedding("hello");
    expect(result).toEqual(fakeVector);
    expect(mockCreate).toHaveBeenCalledWith({
      model: "text-embedding-3-small",
      input: "hello",
    });
  });
});

describe("createEmbeddings", () => {
  it("returns array of vectors for multiple texts", async () => {
    const vecs = [[0.1], [0.2]];
    mockCreate.mockResolvedValueOnce({
      data: vecs.map((v) => ({ embedding: v })),
    });

    const result = await createEmbeddings(["a", "b"]);
    expect(result).toEqual(vecs);
    expect(mockCreate).toHaveBeenCalledWith({
      model: "text-embedding-3-small",
      input: ["a", "b"],
    });
  });
});
