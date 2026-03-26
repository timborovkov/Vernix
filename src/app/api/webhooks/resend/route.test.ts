const { mockSendEmail } = vi.hoisted(() => ({
  mockSendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/email/send", () => ({ sendEmail: mockSendEmail }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitByIp: () => ({ success: true, remaining: 99 }),
}));

import { POST } from "./route";
import { createJsonRequest, parseJsonResponse } from "@/test/helpers";

const URL = "http://localhost/api/webhooks/resend";

describe("POST /api/webhooks/resend", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "test-secret");
    vi.stubEnv("EMAIL_FORWARD_TO", "admin@example.com");
  });

  it("forwards inbound email to configured recipients", async () => {
    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        type: "email.received",
        data: {
          from: "sender@example.com",
          to: ["hello@vernix.app"],
          subject: "Test email",
          text: "Hello there",
        },
      },
    });
    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["admin@example.com"],
        subject: "[Fwd] Test email",
        replyTo: "sender@example.com",
      })
    );
  });

  it("acknowledges non-handled event types with 200", async () => {
    const req = createJsonRequest(URL, {
      method: "POST",
      body: { type: "email.delivered", data: {} },
    });
    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(200);
    expect(data.received).toBe(true);
    expect(data.event).toBe("email.delivered");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("skips inbound email with missing from/subject", async () => {
    const req = createJsonRequest(URL, {
      method: "POST",
      body: { type: "email.received", data: { text: "no from or subject" } },
    });
    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(200);
    expect(data.skipped).toBe(true);
  });

  it("skips forwarding when EMAIL_FORWARD_TO is not set", async () => {
    vi.stubEnv("EMAIL_FORWARD_TO", "");

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        type: "email.received",
        data: { from: "a@b.com", subject: "Test" },
      },
    });
    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(200);
    expect(data.received).toBe(true);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 503 when webhook secret is not configured", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "");

    const req = createJsonRequest(URL, {
      method: "POST",
      body: { type: "email.received", data: {} },
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(503);
  });

  it("returns 500 when email forwarding fails", async () => {
    mockSendEmail.mockResolvedValueOnce({ success: false, error: "fail" });

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        type: "email.received",
        data: { from: "a@b.com", subject: "Test", text: "body" },
      },
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(500);
  });

  it("returns 400 on missing event type", async () => {
    const req = createJsonRequest(URL, {
      method: "POST",
      body: { data: {} },
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
  });

  it("returns 400 on malformed JSON", async () => {
    const req = new Request(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
  });
});
