import { describe, it, expect, vi, beforeEach } from "vitest";
import { fakeMeeting } from "@/test/helpers";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockDb, mockJoinMeeting, mockLeaveMeeting, mockProcessMeetingEnd } =
  vi.hoisted(() => {
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
      mockJoinMeeting: vi.fn(),
      mockLeaveMeeting: vi.fn(),
      mockProcessMeetingEnd: vi.fn().mockResolvedValue(undefined),
    };
  });

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/meeting-bot", () => ({
  getMeetingBotProvider: vi.fn().mockReturnValue({
    joinMeeting: mockJoinMeeting,
    leaveMeeting: mockLeaveMeeting,
  }),
}));
vi.mock("@/lib/agent/processing", () => ({
  processMeetingEnd: mockProcessMeetingEnd,
}));

import { canStartMeeting } from "@/lib/billing/limits";

const USER_ID = "b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22";

function resetDbChain() {
  for (const m of Object.keys(mockDb)) {
    mockDb[m].mockReset().mockImplementation(() => mockDb);
  }
  // Default: .returning() resolves to a row (for optimistic locking UPDATEs)
  mockDb.returning.mockReset().mockResolvedValue([{ id: "mock-id" }]);
  mockJoinMeeting.mockReset();
  mockLeaveMeeting.mockReset();
  mockProcessMeetingEnd.mockReset().mockResolvedValue(undefined);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

import { joinMeeting, stopMeeting } from "./agent";

describe("joinMeeting", () => {
  beforeEach(resetDbChain);

  it("throws NotFoundError when meeting does not exist", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    await expect(joinMeeting(USER_ID, "nonexistent")).rejects.toThrow(
      "Meeting not found"
    );
  });

  it("throws ConflictError for active meeting", async () => {
    mockDb.where.mockResolvedValueOnce([fakeMeeting({ status: "active" })]);

    await expect(
      joinMeeting(USER_ID, "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11")
    ).rejects.toThrow("Cannot join meeting with status: active");
  });

  it("throws ConflictError for processing meeting", async () => {
    mockDb.where.mockResolvedValueOnce([fakeMeeting({ status: "processing" })]);

    await expect(
      joinMeeting(USER_ID, "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11")
    ).rejects.toThrow("Cannot join meeting with status: processing");
  });

  it("throws ConflictError for completed meeting", async () => {
    mockDb.where.mockResolvedValueOnce([fakeMeeting({ status: "completed" })]);

    await expect(
      joinMeeting(USER_ID, "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11")
    ).rejects.toThrow("Cannot join meeting with status: completed");
  });

  it("allows joining from pending status", async () => {
    const meeting = fakeMeeting({ status: "pending" });
    mockDb.where.mockResolvedValueOnce([meeting]);
    mockJoinMeeting.mockResolvedValueOnce({
      botId: "bot-456",
      voiceSecret: "secret-abc",
    });

    const result = await joinMeeting(USER_ID, meeting.id);

    expect(result).toEqual({ botId: "bot-456", status: "active" });
  });

  it("allows joining from failed status", async () => {
    const meeting = fakeMeeting({ status: "failed" });
    mockDb.where.mockResolvedValueOnce([meeting]);
    mockJoinMeeting.mockResolvedValueOnce({
      botId: "bot-789",
      voiceSecret: "secret-xyz",
    });

    const result = await joinMeeting(USER_ID, meeting.id);

    expect(result).toEqual({ botId: "bot-789", status: "active" });
  });

  it("throws BillingError when canStartMeeting rejects", async () => {
    mockDb.where.mockResolvedValueOnce([fakeMeeting({ status: "pending" })]);
    vi.mocked(canStartMeeting).mockReturnValueOnce({
      allowed: false,
      reason: "Too many concurrent meetings",
    });

    await expect(
      joinMeeting(USER_ID, "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11")
    ).rejects.toThrow("Too many concurrent meetings");
  });

  it("sets status to 'joining' before calling provider", async () => {
    const meeting = fakeMeeting({ status: "pending" });
    mockDb.where.mockResolvedValueOnce([meeting]);

    const callOrder: string[] = [];
    mockDb.set.mockImplementation((...args: unknown[]) => {
      const firstArg = args[0] as Record<string, unknown>;
      callOrder.push(`set:${firstArg.status}`);
      return mockDb;
    });
    mockJoinMeeting.mockImplementation(() => {
      callOrder.push("provider:join");
      return { botId: "bot-1", voiceSecret: "s" };
    });

    await joinMeeting(USER_ID, meeting.id);

    expect(callOrder[0]).toBe("set:joining");
    expect(callOrder[1]).toBe("provider:join");
    expect(callOrder[2]).toBe("set:active");
  });

  it("stores botId and voiceSecret in metadata on success", async () => {
    const meeting = fakeMeeting({
      status: "pending",
      metadata: { agenda: "existing" },
    });
    mockDb.where.mockResolvedValueOnce([meeting]);
    mockJoinMeeting.mockResolvedValueOnce({
      botId: "bot-abc",
      voiceSecret: "vs-123",
    });

    await joinMeeting(USER_ID, meeting.id);

    const setCalls = mockDb.set.mock.calls;
    const activeSetCall = setCalls[1][0] as Record<string, unknown>;
    expect(activeSetCall.status).toBe("active");
    expect(activeSetCall.metadata).toEqual(
      expect.objectContaining({
        agenda: "existing",
        botId: "bot-abc",
        voiceSecret: "vs-123",
        silent: false,
      })
    );
  });

  it("resets status to 'failed' when provider throws", async () => {
    const meeting = fakeMeeting({ status: "pending" });
    mockDb.where.mockResolvedValueOnce([meeting]);
    mockJoinMeeting.mockRejectedValueOnce(new Error("Bot provider error"));

    await expect(joinMeeting(USER_ID, meeting.id)).rejects.toThrow(
      "Bot provider error"
    );

    const lastSetCall = mockDb.set.mock.calls.at(-1)![0] as Record<
      string,
      unknown
    >;
    expect(lastSetCall.status).toBe("failed");
  });

  it("passes silent option to provider based on meeting metadata", async () => {
    const meeting = fakeMeeting({
      status: "pending",
      metadata: { silent: true },
    });
    mockDb.where.mockResolvedValueOnce([meeting]);
    mockJoinMeeting.mockResolvedValueOnce({
      botId: "b",
      voiceSecret: undefined,
    });

    await joinMeeting(USER_ID, meeting.id);

    expect(mockJoinMeeting).toHaveBeenCalledWith(
      meeting.joinLink,
      meeting.id,
      undefined, // userName
      { silent: true }
    );
  });
});

describe("stopMeeting", () => {
  beforeEach(resetDbChain);

  it("throws NotFoundError when meeting does not exist", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    await expect(stopMeeting(USER_ID, "nonexistent")).rejects.toThrow(
      "Meeting not found"
    );
  });

  it("throws ConflictError for pending meeting", async () => {
    mockDb.where.mockResolvedValueOnce([fakeMeeting({ status: "pending" })]);

    await expect(
      stopMeeting(USER_ID, "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11")
    ).rejects.toThrow("Cannot stop meeting with status: pending");
  });

  it("throws ConflictError for completed meeting", async () => {
    mockDb.where.mockResolvedValueOnce([fakeMeeting({ status: "completed" })]);

    await expect(
      stopMeeting(USER_ID, "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11")
    ).rejects.toThrow("Cannot stop meeting with status: completed");
  });

  it("throws ConflictError for failed meeting", async () => {
    mockDb.where.mockResolvedValueOnce([fakeMeeting({ status: "failed" })]);

    await expect(
      stopMeeting(USER_ID, "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11")
    ).rejects.toThrow("Cannot stop meeting with status: failed");
  });

  it("calls leaveMeeting for active meeting", async () => {
    const meeting = fakeMeeting({
      status: "active",
      metadata: { botId: "bot-111" },
    });
    mockDb.where
      .mockResolvedValueOnce([meeting]) // initial fetch
      .mockImplementationOnce(() => mockDb) // processing update
      .mockResolvedValueOnce([{ status: "completed" }]); // re-fetch
    mockLeaveMeeting.mockResolvedValueOnce(undefined);

    await stopMeeting(USER_ID, meeting.id);

    expect(mockLeaveMeeting).toHaveBeenCalledWith("bot-111");
  });

  it("calls leaveMeeting for joining meeting", async () => {
    const meeting = fakeMeeting({
      status: "joining",
      metadata: { botId: "bot-222" },
    });
    mockDb.where
      .mockResolvedValueOnce([meeting])
      .mockImplementationOnce(() => mockDb)
      .mockResolvedValueOnce([{ status: "completed" }]);
    mockLeaveMeeting.mockResolvedValueOnce(undefined);

    await stopMeeting(USER_ID, meeting.id);

    expect(mockLeaveMeeting).toHaveBeenCalledWith("bot-222");
  });

  it("does NOT call leaveMeeting for processing meeting", async () => {
    const meeting = fakeMeeting({
      status: "processing",
      metadata: { botId: "bot-333" },
    });
    mockDb.where
      .mockResolvedValueOnce([meeting]) // initial fetch
      .mockImplementationOnce(() => mockDb) // processing update
      .mockResolvedValueOnce([{ status: "completed" }]); // re-fetch

    await stopMeeting(USER_ID, meeting.id);

    expect(mockLeaveMeeting).not.toHaveBeenCalled();
  });

  it("sets status to 'processing' and calls processMeetingEnd", async () => {
    const meeting = fakeMeeting({
      status: "active",
      metadata: { botId: "bot-444" },
    });
    mockDb.where
      .mockResolvedValueOnce([meeting])
      .mockImplementationOnce(() => mockDb)
      .mockResolvedValueOnce([{ status: "processing" }]);
    mockLeaveMeeting.mockResolvedValueOnce(undefined);

    const result = await stopMeeting(USER_ID, meeting.id);

    expect(result).toEqual({ status: "processing" });

    const setCall = mockDb.set.mock.calls[0][0] as Record<string, unknown>;
    expect(setCall.status).toBe("processing");

    expect(mockProcessMeetingEnd).toHaveBeenCalledWith(
      meeting.id,
      USER_ID,
      meeting.qdrantCollectionName,
      expect.objectContaining({
        botId: "bot-444",
        title: meeting.title,
      })
    );
  });

  it("continues processing even if leaveMeeting fails", async () => {
    const meeting = fakeMeeting({
      status: "active",
      metadata: { botId: "bot-555" },
    });
    mockDb.where
      .mockResolvedValueOnce([meeting])
      .mockImplementationOnce(() => mockDb)
      .mockResolvedValueOnce([{ status: "processing" }]);
    mockLeaveMeeting.mockRejectedValueOnce(new Error("Bot already left"));

    const result = await stopMeeting(USER_ID, meeting.id);

    expect(result).toEqual({ status: "processing" });
    expect(mockProcessMeetingEnd).toHaveBeenCalled();
  });
});
