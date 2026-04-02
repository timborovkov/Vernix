import { describe, it, expect, vi, beforeEach } from "vitest";
import { fakeMeeting, fakeDocument } from "@/test/helpers";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const {
  mockDb,
  mockCreateCollection,
  mockDeleteCollection,
  mockUpsertAgenda,
  mockDeleteFile,
  mockDeleteBot,
} = vi.hoisted(() => {
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
    mockCreateCollection: vi.fn().mockResolvedValue(undefined),
    mockDeleteCollection: vi.fn().mockResolvedValue(undefined),
    mockUpsertAgenda: vi.fn().mockResolvedValue(undefined),
    mockDeleteFile: vi.fn().mockResolvedValue(undefined),
    mockDeleteBot: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/vector/collections", () => ({
  createMeetingCollection: mockCreateCollection,
  deleteMeetingCollection: mockDeleteCollection,
}));
vi.mock("@/lib/vector/agenda", () => ({
  upsertAgenda: mockUpsertAgenda,
}));
vi.mock("@/lib/storage/operations", () => ({
  deleteFile: mockDeleteFile,
}));
vi.mock("@/lib/meeting-bot", () => ({
  getMeetingBotProvider: vi.fn().mockReturnValue({
    deleteBot: mockDeleteBot,
  }),
}));

import { canStartMeeting } from "@/lib/billing/limits";

const USER_ID = "b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22";

function resetDbChain() {
  for (const m of Object.keys(mockDb)) {
    mockDb[m].mockReset().mockImplementation(() => mockDb);
  }
  mockCreateCollection.mockReset().mockResolvedValue(undefined);
  mockDeleteCollection.mockReset().mockResolvedValue(undefined);
  mockUpsertAgenda.mockReset().mockResolvedValue(undefined);
  mockDeleteFile.mockReset().mockResolvedValue(undefined);
  mockDeleteBot.mockReset().mockResolvedValue(undefined);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

import {
  listMeetings,
  createMeeting,
  getMeeting,
  updateMeeting,
  deleteMeeting,
} from "./meetings";

describe("listMeetings", () => {
  beforeEach(resetDbChain);

  it("queries with userId condition and default limit of 21 (limit+1)", async () => {
    const meetings = [fakeMeeting(), fakeMeeting({ id: "second-id" })];
    mockDb.limit.mockResolvedValueOnce(meetings);

    const result = await listMeetings(USER_ID, {});

    expect(mockDb.select).toHaveBeenCalled();
    expect(mockDb.from).toHaveBeenCalled();
    expect(mockDb.where).toHaveBeenCalled();
    expect(mockDb.limit).toHaveBeenCalledWith(21); // default 20 + 1
    expect(result.data).toHaveLength(2);
    expect(result.meta.hasMore).toBe(false);
  });

  it("returns hasMore=true and nextCursor when rows exceed limit", async () => {
    const limit = 2;
    const meetings = [
      fakeMeeting({ id: "1" }),
      fakeMeeting({ id: "2" }),
      fakeMeeting({ id: "3" }),
    ];
    mockDb.limit.mockResolvedValueOnce(meetings);

    const result = await listMeetings(USER_ID, { limit });

    expect(mockDb.limit).toHaveBeenCalledWith(3); // 2 + 1
    expect(result.data).toHaveLength(2);
    expect(result.meta.hasMore).toBe(true);
    expect(result.meta.nextCursor).toBeDefined();
  });

  it("respects custom limit parameter", async () => {
    mockDb.limit.mockResolvedValueOnce([]);

    await listMeetings(USER_ID, { limit: 5 });

    expect(mockDb.limit).toHaveBeenCalledWith(6); // 5 + 1
  });
});

describe("createMeeting", () => {
  beforeEach(resetDbChain);

  it("throws BillingError when canStartMeeting says not allowed", async () => {
    vi.mocked(canStartMeeting).mockReturnValueOnce({
      allowed: false,
      reason: "Meeting limit reached",
    });

    await expect(
      createMeeting(USER_ID, {
        title: "Test",
        joinLink: "https://meet.google.com/abc",
      })
    ).rejects.toThrow("Meeting limit reached");
  });

  it("creates Qdrant collection before inserting meeting", async () => {
    const meeting = fakeMeeting();
    mockDb.returning.mockResolvedValueOnce([meeting]);
    mockDb.where.mockResolvedValue(undefined);

    await createMeeting(USER_ID, {
      title: "Test",
      joinLink: "https://meet.google.com/abc",
    });

    expect(mockCreateCollection).toHaveBeenCalledTimes(1);
    const collectionArg = mockCreateCollection.mock.calls[0][0] as string;
    expect(collectionArg).toMatch(/^meeting_[a-f0-9]{32}$/);
  });

  it("inserts meeting with correct userId and link", async () => {
    const meeting = fakeMeeting();
    mockDb.returning.mockResolvedValueOnce([meeting]);
    mockDb.where.mockResolvedValue(undefined);

    await createMeeting(USER_ID, {
      title: "My Meeting",
      joinLink: "https://meet.google.com/xyz",
    });

    expect(mockDb.values).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "My Meeting",
        joinLink: "https://meet.google.com/xyz",
        userId: USER_ID,
      })
    );
  });

  it("embeds agenda when provided", async () => {
    const meeting = fakeMeeting();
    mockDb.returning.mockResolvedValueOnce([meeting]);
    mockDb.where.mockResolvedValue(undefined);

    await createMeeting(USER_ID, {
      title: "Test",
      joinLink: "https://meet.google.com/abc",
      agenda: "Discuss Q4 roadmap",
    });

    expect(mockUpsertAgenda).toHaveBeenCalledWith(
      expect.stringMatching(/^meeting_/),
      "Discuss Q4 roadmap"
    );
  });

  it("does NOT embed agenda when not provided", async () => {
    const meeting = fakeMeeting();
    mockDb.returning.mockResolvedValueOnce([meeting]);
    mockDb.where.mockResolvedValue(undefined);

    await createMeeting(USER_ID, {
      title: "Test",
      joinLink: "https://meet.google.com/abc",
    });

    expect(mockUpsertAgenda).not.toHaveBeenCalled();
  });

  it("sets silent in metadata when requested", async () => {
    const meeting = fakeMeeting();
    mockDb.returning.mockResolvedValueOnce([meeting]);
    mockDb.where.mockResolvedValue(undefined);

    await createMeeting(USER_ID, {
      title: "Test",
      joinLink: "https://meet.google.com/abc",
      silent: true,
    });

    expect(mockDb.values).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ silent: true }),
      })
    );
  });

  it("uses voice mode for billing check when silent is false", async () => {
    const meeting = fakeMeeting();
    mockDb.returning.mockResolvedValueOnce([meeting]);
    mockDb.where.mockResolvedValue(undefined);

    await createMeeting(USER_ID, {
      title: "Test",
      joinLink: "https://meet.google.com/abc",
      silent: false,
    });

    // canStartMeeting is called with isVoice=true (i.e. !silent)
    expect(canStartMeeting).toHaveBeenCalledWith(
      expect.anything(), // limits
      true, // !silent -> voice
      expect.anything(), // usedMinutes
      expect.anything(), // activeMeetings
      expect.anything(), // monthlyCount
      expect.anything() // monthlyVoiceMeetingCount
    );
  });
});

describe("getMeeting", () => {
  beforeEach(resetDbChain);

  it("returns meeting when found", async () => {
    const meeting = fakeMeeting();
    mockDb.where.mockResolvedValueOnce([meeting]);

    const result = await getMeeting(USER_ID, meeting.id);
    expect(result).toEqual(meeting);
  });

  it("throws NotFoundError when meeting does not exist", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    await expect(getMeeting(USER_ID, "nonexistent")).rejects.toThrow(
      "Meeting not found"
    );
  });

  it("throws NotFoundError for wrong userId (ownership check)", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    await expect(getMeeting("other-user", "some-id")).rejects.toThrow(
      "Meeting not found"
    );
  });
});

describe("updateMeeting", () => {
  beforeEach(resetDbChain);

  it("throws ValidationError when agenda exceeds 10,000 characters", async () => {
    const meeting = fakeMeeting();
    mockDb.where.mockResolvedValueOnce([meeting]);

    const longAgenda = "a".repeat(10001);
    await expect(
      updateMeeting(USER_ID, meeting.id, { agenda: longAgenda })
    ).rejects.toThrow("Agenda must be under 10,000 characters");
  });

  it("applies silent only for pending status", async () => {
    const meeting = fakeMeeting({ status: "pending", metadata: {} });
    mockDb.where.mockResolvedValueOnce([meeting]);
    const updated = fakeMeeting({
      status: "pending",
      metadata: { silent: true },
    });
    mockDb.returning.mockResolvedValueOnce([updated]);

    await updateMeeting(USER_ID, meeting.id, { silent: true });

    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ silent: true }),
      })
    );
  });

  it("ignores silent for active meetings", async () => {
    const meeting = fakeMeeting({ status: "active", metadata: {} });
    mockDb.where.mockResolvedValueOnce([meeting]);
    const updated = fakeMeeting({ status: "active" });
    mockDb.returning.mockResolvedValueOnce([updated]);

    await updateMeeting(USER_ID, meeting.id, { silent: true });

    const setCall = mockDb.set.mock.calls[0][0] as Record<string, unknown>;
    expect(setCall.metadata).toBeUndefined();
  });

  it("applies muted only for active meetings", async () => {
    const meeting = fakeMeeting({ status: "active", metadata: {} });
    mockDb.where.mockResolvedValueOnce([meeting]);
    const updated = fakeMeeting({
      status: "active",
      metadata: { muted: true },
    });
    mockDb.returning.mockResolvedValueOnce([updated]);

    await updateMeeting(USER_ID, meeting.id, { muted: true });

    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ muted: true }),
      })
    );
  });

  it("ignores muted for pending meetings", async () => {
    const meeting = fakeMeeting({ status: "pending", metadata: {} });
    mockDb.where.mockResolvedValueOnce([meeting]);
    const updated = fakeMeeting({ status: "pending" });
    mockDb.returning.mockResolvedValueOnce([updated]);

    await updateMeeting(USER_ID, meeting.id, { muted: true });

    const setCall = mockDb.set.mock.calls[0][0] as Record<string, unknown>;
    expect(setCall.metadata).toBeUndefined();
  });

  it("merges new metadata with existing metadata", async () => {
    const meeting = fakeMeeting({
      status: "pending",
      metadata: { existingKey: "value" },
    });
    mockDb.where.mockResolvedValueOnce([meeting]);
    const updated = fakeMeeting();
    mockDb.returning.mockResolvedValueOnce([updated]);

    await updateMeeting(USER_ID, meeting.id, { silent: true });

    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          existingKey: "value",
          silent: true,
        }),
      })
    );
  });

  it("embeds agenda via upsertAgenda on update", async () => {
    const meeting = fakeMeeting({ metadata: {} });
    mockDb.where.mockResolvedValueOnce([meeting]);
    const updated = fakeMeeting();
    mockDb.returning.mockResolvedValueOnce([updated]);

    await updateMeeting(USER_ID, meeting.id, { agenda: "New agenda" });

    expect(mockUpsertAgenda).toHaveBeenCalledWith(
      meeting.qdrantCollectionName,
      "New agenda"
    );
  });
});

describe("deleteMeeting", () => {
  beforeEach(resetDbChain);

  it("throws NotFoundError when meeting does not exist", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    await expect(deleteMeeting(USER_ID, "nonexistent")).rejects.toThrow(
      "Meeting not found"
    );
  });

  it("deletes S3 recording when recordingKey exists", async () => {
    const meeting = fakeMeeting({ metadata: { recordingKey: "rec/abc.mp4" } });
    mockDb.where
      .mockResolvedValueOnce([meeting]) // getMeeting
      .mockResolvedValueOnce([]); // meeting-scoped docs query
    mockDb.returning.mockResolvedValue([]);

    await deleteMeeting(USER_ID, meeting.id);

    expect(mockDeleteFile).toHaveBeenCalledWith("rec/abc.mp4");
  });

  it("deletes Qdrant collection", async () => {
    const meeting = fakeMeeting();
    mockDb.where
      .mockResolvedValueOnce([meeting]) // getMeeting
      .mockResolvedValueOnce([]); // meeting-scoped docs query

    await deleteMeeting(USER_ID, meeting.id);

    expect(mockDeleteCollection).toHaveBeenCalledWith(
      meeting.qdrantCollectionName
    );
  });

  it("cleans up meeting-scoped documents from S3", async () => {
    const meeting = fakeMeeting();
    const docs = [
      fakeDocument({ s3Key: "knowledge/user/doc1/file1.pdf" }),
      fakeDocument({ s3Key: "knowledge/user/doc2/file2.pdf" }),
    ];
    mockDb.where
      .mockResolvedValueOnce([meeting]) // getMeeting
      .mockResolvedValueOnce(docs) // meeting-scoped docs query
      .mockResolvedValueOnce([]) // delete documents
      .mockResolvedValue(undefined); // final meeting delete

    await deleteMeeting(USER_ID, meeting.id);

    expect(mockDeleteFile).toHaveBeenCalledWith(
      "knowledge/user/doc1/file1.pdf"
    );
    expect(mockDeleteFile).toHaveBeenCalledWith(
      "knowledge/user/doc2/file2.pdf"
    );
  });

  it("calls deleteBot when botId exists in metadata", async () => {
    const meeting = fakeMeeting({ metadata: { botId: "bot-123" } });
    mockDb.where
      .mockResolvedValueOnce([meeting]) // getMeeting
      .mockResolvedValueOnce([]); // meeting-scoped docs

    await deleteMeeting(USER_ID, meeting.id);

    expect(mockDeleteBot).toHaveBeenCalledWith("bot-123");
  });

  it("continues cleanup even if S3 delete fails", async () => {
    const meeting = fakeMeeting({ metadata: { recordingKey: "rec/abc.mp4" } });
    mockDeleteFile.mockRejectedValueOnce(new Error("S3 fail"));
    mockDb.where
      .mockResolvedValueOnce([meeting]) // getMeeting
      .mockResolvedValueOnce([]); // meeting-scoped docs

    await deleteMeeting(USER_ID, meeting.id);

    expect(mockDeleteCollection).toHaveBeenCalled();
  });
});
