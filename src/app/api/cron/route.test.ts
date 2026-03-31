import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseJsonResponse } from "@/test/helpers";

const mockRunDueCronJobs = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    ran: ["meeting-recovery"],
    skipped: ["billing-sync", "recording-retention", "upgrade-reminders"],
    results: { "meeting-recovery": { recovered: 0 } },
    errors: {},
  })
);

vi.mock("@/lib/cron", () => ({
  runDueCronJobs: mockRunDueCronJobs,
}));

import { GET } from "./route";

describe("GET /api/cron", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
  });

  it("returns 401 when CRON_SECRET is not set", async () => {
    vi.stubEnv("CRON_SECRET", "");

    const req = new Request("http://localhost/api/cron", {
      headers: { authorization: "Bearer test-cron-secret" },
    });

    const response = await GET(req);
    expect(response.status).toBe(401);
  });

  it("returns 401 when authorization header is missing", async () => {
    const req = new Request("http://localhost/api/cron");

    const response = await GET(req);
    expect(response.status).toBe(401);
  });

  it("returns 401 when authorization header has wrong secret", async () => {
    const req = new Request("http://localhost/api/cron", {
      headers: { authorization: "Bearer wrong-secret" },
    });

    const response = await GET(req);
    expect(response.status).toBe(401);
  });

  it("runs due cron jobs and returns summary", async () => {
    const req = new Request("http://localhost/api/cron", {
      headers: { authorization: "Bearer test-cron-secret" },
    });

    const response = await GET(req);
    const { status, data } = await parseJsonResponse(response);

    expect(status).toBe(200);
    expect(data.ran).toContain("meeting-recovery");
    expect(data.skipped).toContain("billing-sync");
    expect(data.results["meeting-recovery"]).toEqual({ recovered: 0 });
    expect(data.errors).toEqual({});
    expect(mockRunDueCronJobs).toHaveBeenCalledOnce();
  });

  it("returns error details when a job fails", async () => {
    mockRunDueCronJobs.mockResolvedValueOnce({
      ran: ["meeting-recovery"],
      skipped: [],
      results: {},
      errors: { "meeting-recovery": "DB connection failed" },
    });

    const req = new Request("http://localhost/api/cron", {
      headers: { authorization: "Bearer test-cron-secret" },
    });

    const response = await GET(req);
    const { status, data } = await parseJsonResponse(response);

    expect(status).toBe(200);
    expect(data.errors["meeting-recovery"]).toBe("DB connection failed");
  });
});
