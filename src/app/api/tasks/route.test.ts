const { mockDb } = vi.hoisted(() => {
  const db: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of [
    "select",
    "from",
    "where",
    "orderBy",
    "leftJoin",
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

import { GET } from "./route";
import { parseJsonResponse } from "@/test/helpers";

describe("GET /api/tasks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns open tasks with meeting titles", async () => {
    const tasks = [
      {
        id: "t1",
        meetingId: "m1",
        title: "Review doc",
        assignee: "Alice",
        status: "open",
        dueDate: null,
        createdAt: new Date().toISOString(),
        meetingTitle: "Weekly standup",
      },
    ];
    mockDb.orderBy.mockResolvedValueOnce(tasks);

    const req = new Request("http://localhost/api/tasks?status=open");
    const { status, data } = await parseJsonResponse(await GET(req));

    expect(status).toBe(200);
    expect(data.tasks).toHaveLength(1);
    expect(data.tasks[0].meetingTitle).toBe("Weekly standup");
  });
});
