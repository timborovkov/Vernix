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
    "execute",
  ]) {
    db[m] = vi.fn().mockImplementation(() => db);
  }
  // transaction passes the db mock as the tx argument
  db.transaction = vi
    .fn()
    .mockImplementation(async (fn: (tx: typeof db) => Promise<void>) => {
      await fn(db);
    });
  return { mockDb: db };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));

import { storeExtractedTasks } from "./store";

const MEETING_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const USER_ID = "b1ffcd00-1a2b-4ef8-bb6d-7cc0ce491b22";

describe("storeExtractedTasks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes auto-extracted tasks and inserts new ones in a transaction", async () => {
    await storeExtractedTasks(MEETING_ID, USER_ID, [
      { title: "Task A", assignee: "Alice" },
      { title: "Task B", assignee: null },
    ]);

    expect(mockDb.transaction).toHaveBeenCalled();
    expect(mockDb.delete).toHaveBeenCalled();
    expect(mockDb.values).toHaveBeenCalledWith([
      {
        meetingId: MEETING_ID,
        userId: USER_ID,
        title: "Task A",
        assignee: "Alice",
        autoExtracted: true,
      },
      {
        meetingId: MEETING_ID,
        userId: USER_ID,
        title: "Task B",
        assignee: null,
        autoExtracted: true,
      },
    ]);
  });

  it("only deletes when items array is empty", async () => {
    await storeExtractedTasks(MEETING_ID, USER_ID, []);

    expect(mockDb.transaction).toHaveBeenCalled();
    expect(mockDb.delete).toHaveBeenCalled();
    expect(mockDb.insert).not.toHaveBeenCalled();
  });
});
