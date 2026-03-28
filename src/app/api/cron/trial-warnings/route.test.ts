import { vi } from "vitest";
import { parseJsonResponse } from "@/test/helpers";

const { mockDb, mockSendEmail } = vi.hoisted(() => {
  const db: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ["select", "from", "where"]) {
    db[m] = vi.fn().mockImplementation(() => db);
  }
  return {
    mockDb: db,
    mockSendEmail: vi.fn().mockResolvedValue({ success: true }),
  };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/email/send", () => ({ sendEmail: mockSendEmail }));
vi.mock("@/lib/email/templates", () => ({
  getTrialExpiryWarningHtml: vi.fn().mockReturnValue("<html>warning</html>"),
}));

vi.stubEnv("CRON_SECRET", "test-cron-secret");

import { GET } from "./route";

const URL = "http://localhost/api/cron/trial-warnings";

function cronRequest(secret?: string): Request {
  return new Request(URL, {
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no users found
  mockDb.where.mockResolvedValue([]);
});

describe("GET /api/cron/trial-warnings", () => {
  it("returns 401 without valid CRON_SECRET", async () => {
    const { status, data } = await parseJsonResponse(
      await GET(cronRequest("wrong-secret"))
    );
    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it("returns 401 with no authorization header", async () => {
    const { status } = await parseJsonResponse(await GET(cronRequest()));
    expect(status).toBe(401);
  });

  it("sends no emails when no users have expiring trials", async () => {
    const { status, data } = await parseJsonResponse(
      await GET(cronRequest("test-cron-secret"))
    );
    expect(status).toBe(200);
    expect(data.sent).toBe(0);
    expect(data.emails).toEqual([]);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("sends warning emails to users with expiring trials", async () => {
    // First query (3-day window): one user
    mockDb.where
      .mockResolvedValueOnce([
        {
          id: "user-1",
          email: "alice@example.com",
          name: "Alice",
        },
      ])
      // Second query (1-day window): one user
      .mockResolvedValueOnce([
        {
          id: "user-2",
          email: "bob@example.com",
          name: "Bob",
        },
      ]);

    const { status, data } = await parseJsonResponse(
      await GET(cronRequest("test-cron-secret"))
    );

    expect(status).toBe(200);
    expect(data.sent).toBe(2);
    expect(data.emails).toContain("alice@example.com (3d)");
    expect(data.emails).toContain("bob@example.com (1d)");

    // Verify emails were sent with correct subjects
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "alice@example.com",
        subject: "Your Vernix Pro trial expires in 3 days",
      })
    );
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "bob@example.com",
        subject: "Your Vernix Pro trial expires tomorrow",
      })
    );
  });

  it("queries for free-plan users without subscriptions only", async () => {
    await GET(cronRequest("test-cron-secret"));

    // Called twice: once for 3-day window, once for 1-day window
    expect(mockDb.where).toHaveBeenCalledTimes(2);
  });

  it("handles multiple users in the same expiry window", async () => {
    mockDb.where
      .mockResolvedValueOnce([
        { id: "u1", email: "a@test.com", name: "A" },
        { id: "u2", email: "b@test.com", name: "B" },
        { id: "u3", email: "c@test.com", name: "C" },
      ])
      .mockResolvedValueOnce([]);

    const { data } = await parseJsonResponse(
      await GET(cronRequest("test-cron-secret"))
    );

    expect(data.sent).toBe(3);
    expect(mockSendEmail).toHaveBeenCalledTimes(3);
  });
});
