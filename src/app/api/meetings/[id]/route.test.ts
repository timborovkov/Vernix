import {
  createJsonRequest,
  parseJsonResponse,
  fakeMeeting,
} from "@/test/helpers";

const {
  mockGetMeeting,
  mockUpdateMeeting,
  mockDeleteMeeting,
} = vi.hoisted(() => ({
  mockGetMeeting: vi.fn(),
  mockUpdateMeeting: vi.fn(),
  mockDeleteMeeting: vi.fn(),
}));

vi.mock("@/lib/services/meetings", () => ({
  getMeeting: mockGetMeeting,
  updateMeeting: mockUpdateMeeting,
  deleteMeeting: mockDeleteMeeting,
}));

import { GET, PATCH, DELETE } from "./route";

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe("GET /api/meetings/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns meeting when found", async () => {
    mockGetMeeting.mockResolvedValueOnce(fakeMeeting());

    const req = new Request("http://localhost/api/meetings/1");
    const response = await GET(req, makeParams("1"));
    const { status, data } = await parseJsonResponse(response);

    expect(status).toBe(200);
    expect(data.title).toBe("Test Meeting");
    expect(mockGetMeeting).toHaveBeenCalledWith(
      "b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22", // test user id
      "1"
    );
  });

  it("returns 404 when not found", async () => {
    const { NotFoundError } = await import("@/lib/api/errors");
    mockGetMeeting.mockRejectedValueOnce(new NotFoundError("Meeting"));

    const req = new Request("http://localhost/api/meetings/999");
    const response = await GET(req, makeParams("999"));
    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/meetings/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates allowed fields (title, joinLink)", async () => {
    mockUpdateMeeting.mockResolvedValueOnce(fakeMeeting({ title: "Updated" }));

    const req = createJsonRequest("http://localhost/api/meetings/1", {
      method: "PATCH",
      body: { title: "Updated" },
    });
    const response = await PATCH(req, makeParams("1"));
    const { status, data } = await parseJsonResponse(response);

    expect(status).toBe(200);
    expect(data.title).toBe("Updated");
    expect(mockUpdateMeeting).toHaveBeenCalledWith(
      "b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22",
      "1",
      expect.objectContaining({ title: "Updated" })
    );
  });

  it("ignores non-allowlisted fields (status, userId, qdrantCollectionName)", async () => {
    mockUpdateMeeting.mockResolvedValueOnce(fakeMeeting());

    const req = createJsonRequest("http://localhost/api/meetings/1", {
      method: "PATCH",
      body: {
        title: "Good",
        status: "completed",
        userId: "attacker-id",
        qdrantCollectionName: "hacked",
      },
    });
    await PATCH(req, makeParams("1"));

    // Only title should be passed to the service — status, userId, etc. are not extracted
    const passedInput = mockUpdateMeeting.mock.calls[0][2];
    expect(passedInput.title).toBe("Good");
    expect(passedInput.status).toBeUndefined();
    expect(passedInput.userId).toBeUndefined();
    expect(passedInput.qdrantCollectionName).toBeUndefined();
  });

  it("returns 404 when meeting not found", async () => {
    const { NotFoundError } = await import("@/lib/api/errors");
    mockUpdateMeeting.mockRejectedValueOnce(new NotFoundError("Meeting"));

    const req = createJsonRequest("http://localhost/api/meetings/999", {
      method: "PATCH",
      body: { title: "X" },
    });
    const response = await PATCH(req, makeParams("999"));
    expect(response.status).toBe(404);
  });

  it("sets muted in metadata for active meetings", async () => {
    mockUpdateMeeting.mockResolvedValueOnce(
      fakeMeeting({
        status: "active",
        metadata: { botId: "bot-1", muted: true },
      })
    );

    const req = createJsonRequest("http://localhost/api/meetings/1", {
      method: "PATCH",
      body: { muted: true },
    });
    const { status, data } = await parseJsonResponse(
      await PATCH(req, makeParams("1"))
    );

    expect(status).toBe(200);
    expect(mockUpdateMeeting).toHaveBeenCalledWith(
      expect.any(String),
      "1",
      expect.objectContaining({ muted: true })
    );
    expect(data.metadata.muted).toBe(true);
  });

  it("passes muted to service even for non-active meetings (service handles logic)", async () => {
    // The route passes all fields through — the service decides what to apply
    mockUpdateMeeting.mockResolvedValueOnce(fakeMeeting({ status: "pending" }));

    const req = createJsonRequest("http://localhost/api/meetings/1", {
      method: "PATCH",
      body: { muted: true },
    });
    await PATCH(req, makeParams("1"));

    // Route passes muted through; service ignores it for non-active meetings
    expect(mockUpdateMeeting).toHaveBeenCalledWith(
      expect.any(String),
      "1",
      expect.objectContaining({ muted: true })
    );
  });

  it("rejects agenda longer than 10000 characters", async () => {
    const req = createJsonRequest("http://localhost/api/meetings/1", {
      method: "PATCH",
      body: { agenda: "x".repeat(10001) },
    });
    const response = await PATCH(req, makeParams("1"));
    expect(response.status).toBe(400);

    // Service should never be called for invalid input
    expect(mockUpdateMeeting).not.toHaveBeenCalled();
  });

  it("passes silent to service (service handles status-based logic)", async () => {
    // The route passes silent through — the service decides based on meeting status
    mockUpdateMeeting.mockResolvedValueOnce(fakeMeeting({ status: "active" }));

    const req = createJsonRequest("http://localhost/api/meetings/1", {
      method: "PATCH",
      body: { silent: true },
    });
    await PATCH(req, makeParams("1"));

    expect(mockUpdateMeeting).toHaveBeenCalledWith(
      expect.any(String),
      "1",
      expect.objectContaining({ silent: true })
    );
  });
});

describe("DELETE /api/meetings/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 200 on successful delete", async () => {
    mockDeleteMeeting.mockResolvedValueOnce(undefined);

    const req = new Request("http://localhost/api/meetings/1", {
      method: "DELETE",
    });
    const response = await DELETE(req, makeParams("1"));
    const { status, data } = await parseJsonResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDeleteMeeting).toHaveBeenCalledWith(
      "b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22",
      "1"
    );
  });

  it("returns 404 when meeting not found", async () => {
    const { NotFoundError } = await import("@/lib/api/errors");
    mockDeleteMeeting.mockRejectedValueOnce(new NotFoundError("Meeting"));

    const req = new Request("http://localhost/api/meetings/999", {
      method: "DELETE",
    });
    const response = await DELETE(req, makeParams("999"));
    expect(response.status).toBe(404);
  });
});
