import {
  createJsonRequest,
  parseJsonResponse,
  fakeMeeting,
} from "@/test/helpers";

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
vi.mock("@/lib/vector/collections", () => ({
  createMeetingCollection: vi.fn().mockResolvedValue(undefined),
}));

import { GET, POST } from "./route";

describe("GET /api/meetings", () => {
  it("returns all meetings", async () => {
    mockDb.orderBy.mockResolvedValueOnce([fakeMeeting()]);

    const response = await GET();
    const { status, data } = await parseJsonResponse(response);

    expect(status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].title).toBe("Test Meeting");
  });

  it("returns empty array when no meetings", async () => {
    mockDb.orderBy.mockResolvedValueOnce([]);

    const response = await GET();
    const { status, data } = await parseJsonResponse(response);

    expect(status).toBe(200);
    expect(data).toEqual([]);
  });
});

describe("POST /api/meetings", () => {
  it("returns 400 for missing title", async () => {
    const req = createJsonRequest("http://localhost/api/meetings", {
      method: "POST",
      body: { joinLink: "https://meet.google.com/abc" },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid URL", async () => {
    const req = createJsonRequest("http://localhost/api/meetings", {
      method: "POST",
      body: { title: "Test", joinLink: "not-a-url" },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("creates meeting on valid input", async () => {
    mockDb.returning.mockResolvedValueOnce([fakeMeeting()]);

    const req = createJsonRequest("http://localhost/api/meetings", {
      method: "POST",
      body: { title: "Test", joinLink: "https://meet.google.com/abc" },
    });

    const response = await POST(req);
    const { status, data } = await parseJsonResponse(response);

    expect(status).toBe(201);
    expect(data.title).toBe("Test Meeting");
  });
});
