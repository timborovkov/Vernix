import { vi } from "vitest";
import { parseJsonResponse } from "@/test/helpers";

const { mockDb, mockSendEmail, mockTemplate } = vi.hoisted(() => {
  const db: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ["select", "from", "where", "update", "set"]) {
    db[method] = vi.fn().mockImplementation(() => db);
  }

  return {
    mockDb: db,
    mockSendEmail: vi.fn().mockResolvedValue({ success: true }),
    mockTemplate: vi.fn().mockReturnValue("<html>upgrade</html>"),
  };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/email/send", () => ({ sendEmail: mockSendEmail }));
vi.mock("@/lib/email/templates", () => ({
  getFreePlanUpgradeReminderHtml: mockTemplate,
}));

vi.stubEnv("CRON_SECRET", "test-cron-secret");

import { GET } from "./route";

const URL = "http://localhost/api/cron/upgrade-reminders";

function cronRequest(secret?: string): Request {
  return new Request(URL, {
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.where.mockResolvedValue([]);
});

describe("GET /api/cron/upgrade-reminders", () => {
  it("returns 401 without valid CRON_SECRET", async () => {
    const { status, data } = await parseJsonResponse(
      await GET(cronRequest("wrong-secret"))
    );
    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it("sends no emails when no eligible users exist", async () => {
    const { status, data } = await parseJsonResponse(
      await GET(cronRequest("test-cron-secret"))
    );

    expect(status).toBe(200);
    expect(data.sent).toBe(0);
    expect(data.emails).toEqual([]);
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("sends upgrade reminders and updates cadence timestamp", async () => {
    mockDb.where.mockResolvedValueOnce([
      {
        id: "user-1",
        email: "alice@example.com",
        name: "Alice",
      },
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
    expect(data.emails).toEqual(["alice@example.com", "bob@example.com"]);

    expect(mockTemplate).toHaveBeenCalledWith("Alice");
    expect(mockTemplate).toHaveBeenCalledWith("Bob");

    expect(mockSendEmail).toHaveBeenCalledTimes(2);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "alice@example.com",
        subject: "Unlock more with Vernix Pro",
      })
    );
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "bob@example.com",
        subject: "Unlock more with Vernix Pro",
      })
    );

    expect(mockDb.update).toHaveBeenCalledTimes(2);
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({
        updatedAt: expect.any(Date),
        lastUpgradeReminderSentAt: expect.any(Date),
      })
    );
  });
});
