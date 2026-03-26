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

import { PATCH, DELETE } from "./route";
import { createJsonRequest, parseJsonResponse, fakeTask } from "@/test/helpers";

const makeParams = (id: string, taskId: string) => ({
  params: Promise.resolve({ id, taskId }),
});

describe("PATCH /api/meetings/:id/tasks/:taskId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates task status", async () => {
    const updated = fakeTask({ status: "completed" });
    mockDb.returning.mockResolvedValueOnce([updated]);

    const req = createJsonRequest("http://localhost", {
      method: "PATCH",
      body: { status: "completed" },
    });
    const { status, data } = await parseJsonResponse(
      await PATCH(req, makeParams("m1", "t1"))
    );

    expect(status).toBe(200);
    expect(data.status).toBe("completed");
  });

  it("returns 404 when task not found", async () => {
    mockDb.returning.mockResolvedValueOnce([]);

    const req = createJsonRequest("http://localhost", {
      method: "PATCH",
      body: { status: "completed" },
    });
    const { status } = await parseJsonResponse(
      await PATCH(req, makeParams("m1", "t999"))
    );

    expect(status).toBe(404);
  });

  it("ignores disallowed fields and only passes allowlisted ones", async () => {
    const updated = fakeTask({ title: "Hacked" });
    mockDb.returning.mockResolvedValueOnce([updated]);

    const req = createJsonRequest("http://localhost", {
      method: "PATCH",
      body: {
        title: "Legitimate update",
        userId: "attacker-id",
        meetingId: "other-meeting",
        id: "other-task",
        autoExtracted: true,
      },
    });
    await PATCH(req, makeParams("m1", "t1"));

    // set() should include title but NOT userId, meetingId, id, or autoExtracted
    const setArg = mockDb.set.mock.calls[0]![0] as Record<string, unknown>;
    expect(setArg.title).toBe("Legitimate update");
    expect(setArg).not.toHaveProperty("userId");
    expect(setArg).not.toHaveProperty("meetingId");
    expect(setArg).not.toHaveProperty("id");
    expect(setArg).not.toHaveProperty("autoExtracted");
  });

  it("rejects invalid status values", async () => {
    const updated = fakeTask();
    mockDb.returning.mockResolvedValueOnce([updated]);

    const req = createJsonRequest("http://localhost", {
      method: "PATCH",
      body: { status: "deleted" },
    });
    await PATCH(req, makeParams("m1", "t1"));

    // set() should not include the invalid status
    const setArg = mockDb.set.mock.calls[0]![0] as Record<string, unknown>;
    expect(setArg).not.toHaveProperty("status");
  });

  it("returns 400 for invalid dueDate", async () => {
    const req = createJsonRequest("http://localhost", {
      method: "PATCH",
      body: { dueDate: "not-a-date" },
    });
    const { status } = await parseJsonResponse(
      await PATCH(req, makeParams("m1", "t1"))
    );
    expect(status).toBe(400);
  });
});

describe("DELETE /api/meetings/:id/tasks/:taskId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes a task", async () => {
    mockDb.returning.mockResolvedValueOnce([fakeTask()]);

    const req = new Request("http://localhost", { method: "DELETE" });
    const { status, data } = await parseJsonResponse(
      await DELETE(req, makeParams("m1", "t1"))
    );

    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("returns 404 when task not found", async () => {
    mockDb.returning.mockResolvedValueOnce([]);

    const req = new Request("http://localhost", { method: "DELETE" });
    const { status } = await parseJsonResponse(
      await DELETE(req, makeParams("m1", "t999"))
    );

    expect(status).toBe(404);
  });
});
