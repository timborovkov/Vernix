const { mockDb } = vi.hoisted(() => {
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
  ]) {
    db[m] = vi.fn().mockImplementation(() => db);
  }
  return { mockDb: db };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));

import { GET, POST } from "./route";
import {
  createJsonRequest,
  parseJsonResponse,
  fakeMeeting,
  fakeTask,
} from "@/test/helpers";

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe("GET /api/meetings/:id/tasks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns tasks for a meeting", async () => {
    mockDb.where
      .mockResolvedValueOnce([fakeMeeting()]) // meeting ownership check
      .mockReturnValueOnce(mockDb); // tasks query chaining
    mockDb.orderBy.mockResolvedValueOnce([fakeTask(), fakeTask({ id: "t2" })]);

    const req = new Request("http://localhost/api/meetings/1/tasks");
    const { status, data } = await parseJsonResponse(
      await GET(req, makeParams("1"))
    );

    expect(status).toBe(200);
    expect(data.tasks).toHaveLength(2);
  });

  it("returns 404 when meeting not found", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/meetings/999/tasks");
    const { status } = await parseJsonResponse(
      await GET(req, makeParams("999"))
    );

    expect(status).toBe(404);
  });
});

describe("POST /api/meetings/:id/tasks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a task", async () => {
    const task = fakeTask();
    mockDb.where.mockResolvedValueOnce([fakeMeeting()]); // meeting check
    mockDb.returning.mockResolvedValueOnce([task]);

    const req = createJsonRequest("http://localhost/api/meetings/1/tasks", {
      method: "POST",
      body: { title: "New task" },
    });
    const { status, data } = await parseJsonResponse(
      await POST(req, makeParams("1"))
    );

    expect(status).toBe(201);
    expect(data.title).toBe("Follow up with client");
  });

  it("returns 400 for missing title", async () => {
    mockDb.where.mockResolvedValueOnce([fakeMeeting()]);

    const req = createJsonRequest("http://localhost/api/meetings/1/tasks", {
      method: "POST",
      body: {},
    });
    const { status } = await parseJsonResponse(
      await POST(req, makeParams("1"))
    );

    expect(status).toBe(400);
  });
});
