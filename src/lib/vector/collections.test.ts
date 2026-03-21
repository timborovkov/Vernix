const mockClient = {
  createCollection: vi.fn().mockResolvedValue(undefined),
  deleteCollection: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@/lib/vector/client", () => ({
  getQdrantClient: () => mockClient,
}));

import {
  createMeetingCollection,
  deleteMeetingCollection,
} from "./collections";

describe("createMeetingCollection", () => {
  it("creates collection with correct dimensions and distance", async () => {
    await createMeetingCollection("meeting_abc");
    expect(mockClient.createCollection).toHaveBeenCalledWith("meeting_abc", {
      vectors: { size: 1536, distance: "Cosine" },
    });
  });
});

describe("deleteMeetingCollection", () => {
  it("deletes the named collection", async () => {
    await deleteMeetingCollection("meeting_abc");
    expect(mockClient.deleteCollection).toHaveBeenCalledWith("meeting_abc");
  });
});
