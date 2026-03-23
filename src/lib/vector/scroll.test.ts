const { mockQdrantClient } = vi.hoisted(() => ({
  mockQdrantClient: {
    scroll: vi.fn(),
  },
}));

vi.mock("./client", () => ({
  getQdrantClient: () => mockQdrantClient,
}));

import { scrollTranscript } from "./scroll";

describe("scrollTranscript", () => {
  beforeEach(() => {
    mockQdrantClient.scroll.mockReset();
  });

  it("returns empty array for collection with no points", async () => {
    mockQdrantClient.scroll.mockResolvedValueOnce({
      points: [],
      next_page_offset: null,
    });

    const result = await scrollTranscript("coll_empty");

    expect(result).toEqual([]);
    expect(mockQdrantClient.scroll).toHaveBeenCalledWith("coll_empty", {
      limit: 100,
      with_payload: true,
      with_vector: false,
      offset: undefined,
      filter: {
        must: [{ key: "type", match: { value: "transcript" } }],
      },
    });
  });

  it("scrolls multiple pages and sorts by timestamp", async () => {
    mockQdrantClient.scroll
      .mockResolvedValueOnce({
        points: [
          {
            id: "p1",
            payload: { text: "Second", speaker: "B", timestamp_ms: 2000 },
          },
        ],
        next_page_offset: "p2",
      })
      .mockResolvedValueOnce({
        points: [
          {
            id: "p2",
            payload: { text: "First", speaker: "A", timestamp_ms: 1000 },
          },
        ],
        next_page_offset: null,
      });

    const result = await scrollTranscript("coll_multi");

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      text: "First",
      speaker: "A",
      timestampMs: 1000,
    });
    expect(result[1]).toEqual({
      text: "Second",
      speaker: "B",
      timestampMs: 2000,
    });
    expect(mockQdrantClient.scroll).toHaveBeenCalledTimes(2);
  });

  it("handles single page with null next_page_offset", async () => {
    mockQdrantClient.scroll.mockResolvedValueOnce({
      points: [
        {
          id: "p1",
          payload: { text: "Only", speaker: "A", timestamp_ms: 500 },
        },
      ],
      next_page_offset: null,
    });

    const result = await scrollTranscript("coll_single");

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Only");
    expect(mockQdrantClient.scroll).toHaveBeenCalledTimes(1);
  });
});
