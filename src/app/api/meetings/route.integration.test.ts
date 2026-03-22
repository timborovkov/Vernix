import { describe, it, expect, beforeEach } from "vitest";
import { createJsonRequest, parseJsonResponse } from "@/test/helpers";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@/lib/db/schema";

// We need to mock only the vector layer since Qdrant collections
// have unique names and we don't want tests to depend on Qdrant being up
vi.mock("@/lib/vector/collections", () => ({
  createMeetingCollection: vi.fn().mockResolvedValue(undefined),
  deleteMeetingCollection: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/auth/session", () => ({
  requireSessionUser: vi.fn().mockResolvedValue({
    id: "00000000-0000-0000-0000-000000000001",
    email: "integration-test@example.com",
  }),
}));

// Use the test database URL set by setup.integration.ts
let testDb: ReturnType<typeof drizzle>;
let pool: pg.Pool;
const testUserId = "00000000-0000-0000-0000-000000000001";

beforeEach(async () => {
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  testDb = drizzle(pool, { schema });

  // Clean up between tests
  await pool.query("DELETE FROM meetings");
});

afterEach(async () => {
  await pool.end();
});

// Dynamic import so the module picks up the test DATABASE_URL
async function getRoutes() {
  return await import("./route");
}

describe("Integration: /api/meetings", () => {
  it("POST creates a real meeting in the database", async () => {
    const { POST } = await getRoutes();

    const req = createJsonRequest("http://localhost/api/meetings", {
      method: "POST",
      body: {
        title: "Integration Test Meeting",
        joinLink: "https://meet.google.com/abc-defg-hij",
      },
    });

    const res = await POST(req);
    const { status, data } = await parseJsonResponse(res);

    expect(status).toBe(201);
    expect(data.title).toBe("Integration Test Meeting");
    expect(data.status).toBe("pending");
    expect(data.id).toBeDefined();
    expect(data.qdrantCollectionName).toMatch(/^meeting_/);

    // Verify it's actually in the DB
    const rows = await testDb.select().from(schema.meetings);
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("Integration Test Meeting");
  });

  it("GET returns meetings ordered by createdAt desc", async () => {
    // Insert directly
    await testDb.insert(schema.meetings).values({
      userId: testUserId,
      title: "First",
      joinLink: "https://a.com",
      qdrantCollectionName: "c1",
    });

    // Small delay to ensure different timestamps
    await new Promise((r) => setTimeout(r, 10));

    await testDb.insert(schema.meetings).values({
      userId: testUserId,
      title: "Second",
      joinLink: "https://b.com",
      qdrantCollectionName: "c2",
    });

    const { GET } = await getRoutes();
    const res = await GET();
    const { status, data } = await parseJsonResponse(res);

    expect(status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0].title).toBe("Second");
    expect(data[1].title).toBe("First");
  });

  it("POST returns 400 for invalid input", async () => {
    const { POST } = await getRoutes();

    const req = createJsonRequest("http://localhost/api/meetings", {
      method: "POST",
      body: { title: "", joinLink: "not-a-url" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
