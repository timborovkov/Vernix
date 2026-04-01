const { mockListTasks, mockCreateTask } = vi.hoisted(() => ({
  mockListTasks: vi.fn(),
  mockCreateTask: vi.fn(),
}));

vi.mock("@/lib/services/tasks", () => ({
  listTasks: mockListTasks,
  createTask: mockCreateTask,
}));

import { GET, POST } from "./route";
import { createJsonRequest, parseJsonResponse, fakeTask } from "@/test/helpers";

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe("GET /api/meetings/:id/tasks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns tasks for a meeting", async () => {
    mockListTasks.mockResolvedValueOnce({
      data: [fakeTask(), fakeTask({ id: "t2" })],
      meta: { hasMore: false },
    });

    const req = new Request("http://localhost/api/meetings/1/tasks");
    const { status, data } = await parseJsonResponse(
      await GET(req, makeParams("1"))
    );

    expect(status).toBe(200);
    expect(data.tasks).toHaveLength(2);
    expect(mockListTasks).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ meetingId: "1" })
    );
  });

  it("returns 404 when meeting not found", async () => {
    const { NotFoundError } = await import("@/lib/api/errors");
    mockListTasks.mockRejectedValueOnce(new NotFoundError("Meeting"));

    const req = new Request("http://localhost/api/meetings/999/tasks");
    const { status } = await parseJsonResponse(
      await GET(req, makeParams("999"))
    );

    expect(status).toBe(404);
  });
});

describe("POST /api/meetings/:id/tasks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a task with correct meetingId", async () => {
    const task = fakeTask();
    mockCreateTask.mockResolvedValueOnce(task);

    const meetingId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
    const req = createJsonRequest(
      `http://localhost/api/meetings/${meetingId}/tasks`,
      {
        method: "POST",
        body: { title: "New task", assignee: "Alice" },
      }
    );
    const { status, data } = await parseJsonResponse(
      await POST(req, makeParams(meetingId))
    );

    expect(status).toBe(201);
    expect(data.title).toBe("Follow up with client");
    expect(mockCreateTask).toHaveBeenCalledWith(expect.any(String), meetingId, {
      title: "New task",
      assignee: "Alice",
    });
  });

  it("returns 400 for missing title", async () => {
    const req = createJsonRequest("http://localhost/api/meetings/1/tasks", {
      method: "POST",
      body: {},
    });
    const { status } = await parseJsonResponse(
      await POST(req, makeParams("1"))
    );

    expect(status).toBe(400);
    // Service should not be called for invalid input
    expect(mockCreateTask).not.toHaveBeenCalled();
  });

  it("returns 404 when meeting not found", async () => {
    const { NotFoundError } = await import("@/lib/api/errors");
    mockCreateTask.mockRejectedValueOnce(new NotFoundError("Meeting"));

    const req = createJsonRequest("http://localhost/api/meetings/999/tasks", {
      method: "POST",
      body: { title: "Test task" },
    });
    const { status } = await parseJsonResponse(
      await POST(req, makeParams("999"))
    );

    expect(status).toBe(404);
  });
});
