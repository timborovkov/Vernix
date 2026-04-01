import { describe, it, expect, vi, beforeEach } from "vitest";
import { fakeMeeting, fakeTask } from "@/test/helpers";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

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
    "leftJoin",
    "limit",
  ]) {
    db[m] = vi.fn().mockImplementation(() => db);
  }
  return { mockDb: db };
});
vi.mock("@/lib/db", () => ({ db: mockDb }));

const USER_ID = "b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22";

function resetDbChain() {
  for (const m of Object.keys(mockDb)) {
    mockDb[m].mockReset().mockImplementation(() => mockDb);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

import { listTasks, getTask, createTask, updateTask } from "./tasks";

describe("listTasks", () => {
  beforeEach(resetDbChain);

  it("queries with default limit of 21 (limit+1)", async () => {
    mockDb.limit.mockResolvedValueOnce([]);

    await listTasks(USER_ID, {});

    expect(mockDb.limit).toHaveBeenCalledWith(21);
  });

  it("returns paginated results with hasMore", async () => {
    const rows = [
      { ...fakeTask({ id: "1" }), meetingTitle: "M1" },
      { ...fakeTask({ id: "2" }), meetingTitle: "M1" },
      { ...fakeTask({ id: "3" }), meetingTitle: "M1" },
    ];
    mockDb.limit.mockResolvedValueOnce(rows);

    const result = await listTasks(USER_ID, { limit: 2 });

    expect(result.data).toHaveLength(2);
    expect(result.meta.hasMore).toBe(true);
    expect(result.meta.nextCursor).toBeDefined();
  });

  it("returns hasMore=false when fewer rows than limit", async () => {
    const rows = [{ ...fakeTask({ id: "1" }), meetingTitle: "M1" }];
    mockDb.limit.mockResolvedValueOnce(rows);

    const result = await listTasks(USER_ID, { limit: 5 });

    expect(result.data).toHaveLength(1);
    expect(result.meta.hasMore).toBe(false);
  });
});

describe("getTask", () => {
  beforeEach(resetDbChain);

  it("returns task when found", async () => {
    const task = { ...fakeTask(), meetingTitle: "Test Meeting" };
    mockDb.where.mockResolvedValueOnce([task]);

    const result = await getTask(USER_ID, task.id);

    expect(result).toEqual(task);
  });

  it("throws NotFoundError when task does not exist", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    await expect(getTask(USER_ID, "nonexistent")).rejects.toThrow(
      "Task not found"
    );
  });
});

describe("createTask", () => {
  beforeEach(resetDbChain);

  it("throws NotFoundError when meeting is not found (ownership check)", async () => {
    mockDb.where.mockResolvedValueOnce([]); // meeting lookup

    await expect(
      createTask(USER_ID, "nonexistent-meeting", { title: "Do something" })
    ).rejects.toThrow("Meeting not found");
  });

  it("inserts task with correct values", async () => {
    const meeting = fakeMeeting();
    mockDb.where.mockResolvedValueOnce([{ id: meeting.id }]); // meeting lookup
    const task = fakeTask();
    mockDb.returning.mockResolvedValueOnce([task]);

    const result = await createTask(USER_ID, meeting.id, {
      title: "Follow up",
      assignee: "Bob",
    });

    expect(mockDb.values).toHaveBeenCalledWith({
      meetingId: meeting.id,
      userId: USER_ID,
      title: "Follow up",
      assignee: "Bob",
    });
    expect(result).toEqual(task);
  });

  it("sets assignee to null when not provided", async () => {
    const meeting = fakeMeeting();
    mockDb.where.mockResolvedValueOnce([{ id: meeting.id }]); // meeting lookup
    const task = fakeTask();
    mockDb.returning.mockResolvedValueOnce([task]);

    await createTask(USER_ID, meeting.id, { title: "Follow up" });

    expect(mockDb.values).toHaveBeenCalledWith(
      expect.objectContaining({ assignee: null })
    );
  });
});

describe("updateTask", () => {
  beforeEach(resetDbChain);

  it("throws ValidationError for invalid due date", async () => {
    await expect(
      updateTask(USER_ID, "task-1", { dueDate: "not-a-date" })
    ).rejects.toThrow("Invalid due date");
  });

  it("throws NotFoundError when task not found after update", async () => {
    mockDb.returning.mockResolvedValueOnce([]); // update returns nothing

    await expect(
      updateTask(USER_ID, "nonexistent", { title: "Updated" })
    ).rejects.toThrow("Task not found");
  });

  it("sets dueDate to null when null is passed", async () => {
    const task = fakeTask();
    mockDb.returning.mockResolvedValueOnce([task]);

    await updateTask(USER_ID, task.id, { dueDate: null });

    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ dueDate: null })
    );
  });

  it("parses valid due date string to Date", async () => {
    const task = fakeTask();
    mockDb.returning.mockResolvedValueOnce([task]);

    await updateTask(USER_ID, task.id, { dueDate: "2026-06-15" });

    const setArg = mockDb.set.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg.dueDate).toBeInstanceOf(Date);
    expect((setArg.dueDate as Date).toISOString()).toContain("2026-06-15");
  });

  it("sets status correctly", async () => {
    const task = fakeTask();
    mockDb.returning.mockResolvedValueOnce([task]);

    await updateTask(USER_ID, task.id, { status: "completed" });

    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "completed" })
    );
  });

  it("throws ValidationError if title too long (over 500)", async () => {
    const longTitle = "x".repeat(501);
    await expect(
      updateTask(USER_ID, fakeTask().id, { title: longTitle })
    ).rejects.toThrow("Title must be between 1 and 500 characters");
  });

  it("throws ValidationError if title is empty string", async () => {
    await expect(
      updateTask(USER_ID, fakeTask().id, { title: "" })
    ).rejects.toThrow("Title must be between 1 and 500 characters");
  });

  it("always includes updatedAt", async () => {
    const task = fakeTask();
    mockDb.returning.mockResolvedValueOnce([task]);

    await updateTask(USER_ID, task.id, { status: "open" });

    const setArg = mockDb.set.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg.updatedAt).toBeInstanceOf(Date);
  });

  it("sets assignee to null when empty string is provided", async () => {
    const task = fakeTask();
    mockDb.returning.mockResolvedValueOnce([task]);

    await updateTask(USER_ID, task.id, { assignee: "" });

    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ assignee: null })
    );
  });
});
