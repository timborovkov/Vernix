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
  deleteMeetingCollection: vi.fn().mockResolvedValue(undefined),
}));

import { GET, PATCH, DELETE } from "./route";

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe("GET /api/meetings/[id]", () => {
  it("returns meeting when found", async () => {
    mockDb.where.mockResolvedValueOnce([fakeMeeting()]);

    const req = new Request("http://localhost/api/meetings/1");
    const response = await GET(req, makeParams("1"));
    const { status, data } = await parseJsonResponse(response);

    expect(status).toBe(200);
    expect(data.title).toBe("Test Meeting");
  });

  it("returns 404 when not found", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/meetings/999");
    const response = await GET(req, makeParams("999"));
    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/meetings/[id]", () => {
  it("updates and returns meeting", async () => {
    mockDb.returning.mockResolvedValueOnce([fakeMeeting({ title: "Updated" })]);

    const req = createJsonRequest("http://localhost/api/meetings/1", {
      method: "PATCH",
      body: { title: "Updated" },
    });
    const response = await PATCH(req, makeParams("1"));
    const { status, data } = await parseJsonResponse(response);

    expect(status).toBe(200);
    expect(data.title).toBe("Updated");
  });

  it("returns 404 when meeting not found", async () => {
    mockDb.returning.mockResolvedValueOnce([]);

    const req = createJsonRequest("http://localhost/api/meetings/999", {
      method: "PATCH",
      body: { title: "X" },
    });
    const response = await PATCH(req, makeParams("999"));
    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/meetings/[id]", () => {
  it("deletes meeting and qdrant collection", async () => {
    mockDb.where
      .mockResolvedValueOnce([fakeMeeting()])
      .mockResolvedValueOnce(undefined);

    const req = new Request("http://localhost/api/meetings/1", {
      method: "DELETE",
    });
    const response = await DELETE(req, makeParams("1"));
    const { status, data } = await parseJsonResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("returns 404 when meeting not found", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/meetings/999", {
      method: "DELETE",
    });
    const response = await DELETE(req, makeParams("999"));
    expect(response.status).toBe(404);
  });
});
