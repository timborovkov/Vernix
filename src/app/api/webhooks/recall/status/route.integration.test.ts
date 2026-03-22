import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createJsonRequest, parseJsonResponse } from "@/test/helpers";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Mock vector and summary (don't depend on Qdrant/OpenAI)
vi.mock("@/lib/vector/scroll", () => ({
  scrollTranscript: vi.fn().mockResolvedValue([
    {
      text: "Integration test transcript",
      speaker: "Alice",
      timestampMs: 1000,
    },
  ]),
}));
vi.mock("@/lib/summary/generate", () => ({
  generateMeetingSummary: vi.fn().mockResolvedValue("Integration test summary"),
}));
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

describe("Integration: /api/webhooks/recall/status", () => {
  it("bot.call_ended transitions active meeting to processing", async () => {
    const [meeting] = await testDb
      .insert(schema.meetings)
      .values({
        userId: testUserId,
        title: "Status Test",
        joinLink: "https://meet.google.com/test",
        qdrantCollectionName: "coll_status_test",
        status: "active",
        metadata: { botId: "bot-status-1" },
      })
      .returning();

    const { POST } = await getRoutes();

    const req = createJsonRequest(
      "http://localhost/api/webhooks/recall/status",
      {
        method: "POST",
        body: {
          event: "bot.call_ended",
          data: {
            bot: { id: "bot-status-1", metadata: {} },
          },
        },
      }
    );

    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(200);

    // Verify meeting is now processing
    const [updated] = await testDb
      .select()
      .from(schema.meetings)
      .where(eq(schema.meetings.id, meeting.id));

    expect(updated.status).toBe("processing");
    expect(updated.endedAt).not.toBeNull();
  });

  it("transcript.done generates summary and completes meeting", async () => {
    const [meeting] = await testDb
      .insert(schema.meetings)
      .values({
        userId: testUserId,
        title: "Summary Test",
        joinLink: "https://meet.google.com/test",
        qdrantCollectionName: "coll_summary_test",
        status: "processing",
        metadata: { botId: "bot-summary-1" },
      })
      .returning();

    const { POST } = await getRoutes();

    const req = createJsonRequest(
      "http://localhost/api/webhooks/recall/status",
      {
        method: "POST",
        body: {
          event: "transcript.done",
          data: {
            bot: { id: "bot-summary-1", metadata: {} },
          },
        },
      }
    );

    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(200);

    // Verify meeting is completed with summary
    const [updated] = await testDb
      .select()
      .from(schema.meetings)
      .where(eq(schema.meetings.id, meeting.id));

    expect(updated.status).toBe("completed");
    const metadata = updated.metadata as Record<string, unknown>;
    expect(metadata.summary).toBe("Integration test summary");
  });

  it("full flow: bot.call_ended then transcript.done", async () => {
    await testDb.insert(schema.meetings).values({
      userId: testUserId,
      title: "Full Flow Test",
      joinLink: "https://meet.google.com/test",
      qdrantCollectionName: "coll_flow_test",
      status: "active",
      metadata: { botId: "bot-flow-1" },
    });

    const { POST } = await getRoutes();

    // Step 1: bot.call_ended
    const endReq = createJsonRequest(
      "http://localhost/api/webhooks/recall/status",
      {
        method: "POST",
        body: {
          event: "bot.call_ended",
          data: { bot: { id: "bot-flow-1", metadata: {} } },
        },
      }
    );
    await POST(endReq);

    // Verify processing
    let rows = await testDb.select().from(schema.meetings);
    expect(rows[0].status).toBe("processing");

    // Step 2: transcript.done
    const doneReq = createJsonRequest(
      "http://localhost/api/webhooks/recall/status",
      {
        method: "POST",
        body: {
          event: "transcript.done",
          data: { bot: { id: "bot-flow-1", metadata: {} } },
        },
      }
    );
    await POST(doneReq);

    // Verify completed with summary
    rows = await testDb.select().from(schema.meetings);
    expect(rows[0].status).toBe("completed");
    const metadata = rows[0].metadata as Record<string, unknown>;
    expect(metadata.summary).toBe("Integration test summary");
  });

  it("skips bot.call_ended for already completed meeting", async () => {
    await testDb.insert(schema.meetings).values({
      userId: testUserId,
      title: "Already Done",
      joinLink: "https://meet.google.com/test",
      qdrantCollectionName: "coll_done",
      status: "completed",
      metadata: { botId: "bot-done-1" },
    });

    const { POST } = await getRoutes();

    const req = createJsonRequest(
      "http://localhost/api/webhooks/recall/status",
      {
        method: "POST",
        body: {
          event: "bot.call_ended",
          data: { bot: { id: "bot-done-1", metadata: {} } },
        },
      }
    );

    const { data } = await parseJsonResponse(await POST(req));
    expect(data.skipped).toBe(true);
  });
});
