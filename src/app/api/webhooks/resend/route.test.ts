const { mockSendEmail, mockSvixVerify } = vi.hoisted(() => ({
  mockSendEmail: vi.fn().mockResolvedValue({ success: true }),
  mockSvixVerify: vi.fn(),
}));

vi.mock("@/lib/email/send", () => ({ sendEmail: mockSendEmail }));
vi.mock("svix", () => ({
  Webhook: class {
    verify(body: string, _headers: Record<string, string>) {
      return mockSvixVerify(body, _headers);
    }
  },
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitByIp: () => ({ success: true, remaining: 99 }),
}));

import { POST } from "./route";
import { parseJsonResponse } from "@/test/helpers";

const URL = "http://localhost/api/webhooks/resend";

function createWebhookRequest(body: unknown) {
  return new Request(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "svix-id": "msg_test123",
      "svix-timestamp": "1234567890",
      "svix-signature": "v1,test_signature",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/webhooks/resend", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "whsec_test");
    vi.stubEnv("EMAIL_FORWARD_TO", "admin@example.com");
    mockSvixVerify.mockImplementation((body: string) => JSON.parse(body));
  });

  it("forwards inbound email to configured recipients", async () => {
    const payload = {
      type: "email.received",
      data: {
        from: "sender@example.com",
        to: ["hello@vernix.app"],
        subject: "Test email",
        text: "Hello there",
      },
    };

    const { status, data } = await parseJsonResponse(
      await POST(createWebhookRequest(payload))
    );
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
    const { status, data } = await parseJsonResponse(
      await POST(createWebhookRequest({ type: "email.delivered", data: {} }))
    );
    expect(status).toBe(200);
    expect(data.received).toBe(true);
    expect(data.event).toBe("email.delivered");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("skips inbound email with missing from/subject", async () => {
    const { status, data } = await parseJsonResponse(
      await POST(
        createWebhookRequest({
          type: "email.received",
          data: { text: "no from or subject" },
        })
      )
    );
    expect(status).toBe(200);
    expect(data.skipped).toBe(true);
  });

  it("skips forwarding when EMAIL_FORWARD_TO is not set", async () => {
    vi.stubEnv("EMAIL_FORWARD_TO", "");

    const { status, data } = await parseJsonResponse(
      await POST(
        createWebhookRequest({
          type: "email.received",
          data: { from: "a@b.com", subject: "Test" },
        })
      )
    );
    expect(status).toBe(200);
    expect(data.received).toBe(true);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 503 when webhook secret is not configured", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "");

    const { status } = await parseJsonResponse(
      await POST(createWebhookRequest({ type: "email.received", data: {} }))
    );
    expect(status).toBe(503);
  });

  it("returns 401 when signature verification fails", async () => {
    mockSvixVerify.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const { status, data } = await parseJsonResponse(
      await POST(createWebhookRequest({ type: "email.received", data: {} }))
    );
    expect(status).toBe(401);
    expect(data.error).toContain("Invalid webhook signature");
  });

  it("returns 401 when signature headers are missing", async () => {
    const req = new Request(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "email.received" }),
    });

    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(401);
  });

  it("returns 500 when email forwarding fails", async () => {
    mockSendEmail.mockResolvedValueOnce({ success: false, error: "fail" });

    const { status } = await parseJsonResponse(
      await POST(
        createWebhookRequest({
          type: "email.received",
          data: { from: "a@b.com", subject: "Test", text: "body" },
        })
      )
    );
    expect(status).toBe(500);
  });

  it("returns 400 on missing event type", async () => {
    const { status } = await parseJsonResponse(
      await POST(createWebhookRequest({ data: {} }))
    );
    expect(status).toBe(400);
  });
});
