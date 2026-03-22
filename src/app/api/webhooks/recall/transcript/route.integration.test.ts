import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createJsonRequest, parseJsonResponse } from "@/test/helpers";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@/lib/db/schema";

// Mock vector layer (don't depend on Qdrant for integration tests)
vi.mock("@/lib/vector/upsert", () => ({
  upsertTranscriptChunk: vi.fn().mockResolvedValue("point-id"),
}));

// Mock auth (webhooks are public but the module gets loaded)
vi.mock("@/lib/auth/session", () => ({
  requireSessionUser: vi.fn().mockResolvedValue({
    id: "00000000-0000-0000-0000-000000000001",
    email: "test@example.com",
  }),
}));

let testDb: ReturnType<typeof drizzle>;
let pool: pg.Pool;
const testUserId = "00000000-0000-0000-0000-000000000001";

beforeEach(async () => {
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  testDb = drizzle(pool, { schema });
  await pool.query("DELETE FROM meetings");
});

afterEach(async () => {
  await pool.end();
});

async function getRoutes() {
  return await import("./route");
}

describe("Integration: /api/webhooks/recall/transcript", () => {
  it("ingests new-format transcript and updates participants", async () => {
    // Create a meeting with a known botId
    await testDb.insert(schema.meetings).values({
      userId: testUserId,
      title: "Transcript Test",
      joinLink: "https://meet.google.com/test",
      qdrantCollectionName: "coll_transcript_test",
      status: "active",
      metadata: { botId: "bot-integration-1" },
    });

    const { POST } = await getRoutes();

    const req = createJsonRequest(
      "http://localhost/api/webhooks/recall/transcript",
      {
        method: "POST",
        body: {
          event: "transcript.data",
          data: {
            data: {
              words: [
                {
                  text: "Hello",
                  start_timestamp: { relative: 1.5 },
                  end_timestamp: { relative: 2.0 },
                },
                {
                  text: "world",
                  start_timestamp: { relative: 2.0 },
                  end_timestamp: { relative: 2.5 },
                },
              ],
              participant: { id: 1, name: "Alice" },
            },
            bot: { id: "bot-integration-1", metadata: {} },
          },
        },
      }
    );

    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(200);

    // Verify participant was added
    const rows = await testDb.select().from(schema.meetings);
    expect(rows).toHaveLength(1);
    const participants = rows[0].participants as string[];
    expect(participants).toContain("Alice");
  });

  it("rejects transcript for pending meeting", async () => {
    await testDb.insert(schema.meetings).values({
      userId: testUserId,
      title: "Pending Meeting",
      joinLink: "https://meet.google.com/test",
      qdrantCollectionName: "coll_pending",
      status: "pending",
      metadata: { botId: "bot-pending" },
    });

    const { POST } = await getRoutes();

    const req = createJsonRequest(
      "http://localhost/api/webhooks/recall/transcript",
      {
        method: "POST",
        body: {
          event: "transcript.data",
          data: {
            data: {
              words: [
                {
                  text: "test",
                  start_timestamp: { relative: 1.0 },
                  end_timestamp: { relative: 1.5 },
                },
              ],
              participant: { id: 1, name: "Bob" },
            },
            bot: { id: "bot-pending", metadata: {} },
          },
        },
      }
    );

    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
  });

  it("accepts transcript for completed meeting (late delivery)", async () => {
    await testDb.insert(schema.meetings).values({
      userId: testUserId,
      title: "Completed Meeting",
      joinLink: "https://meet.google.com/test",
      qdrantCollectionName: "coll_completed",
      status: "completed",
      metadata: { botId: "bot-completed" },
    });

    const { POST } = await getRoutes();

    const req = createJsonRequest(
      "http://localhost/api/webhooks/recall/transcript",
      {
        method: "POST",
        body: {
          event: "transcript.data",
          data: {
            data: {
              words: [
                {
                  text: "late",
                  start_timestamp: { relative: 5.0 },
                  end_timestamp: { relative: 5.5 },
                },
              ],
              participant: { id: 2, name: "Charlie" },
            },
            bot: { id: "bot-completed", metadata: {} },
          },
        },
      }
    );

    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(200);
  });

  it("returns 404 for unknown bot", async () => {
    const { POST } = await getRoutes();

    const req = createJsonRequest(
      "http://localhost/api/webhooks/recall/transcript",
      {
        method: "POST",
        body: {
          event: "transcript.data",
          data: {
            data: {
              words: [
                {
                  text: "test",
                  start_timestamp: { relative: 1.0 },
                  end_timestamp: { relative: 1.5 },
                },
              ],
              participant: { id: 1, name: "Nobody" },
            },
            bot: { id: "nonexistent-bot", metadata: {} },
          },
        },
      }
    );

    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(404);
  });
});
