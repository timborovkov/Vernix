const { mockForward, mockSvixVerify } = vi.hoisted(() => ({
  mockForward: vi
    .fn()
    .mockResolvedValue({ data: { id: "fwd_123" }, error: null }),
  mockSvixVerify: vi.fn(),
}));

vi.mock("@/lib/email/client", () => ({
  getResend: vi.fn().mockReturnValue({
    emails: {
      receiving: {
        forward: mockForward,
      },
    },
  }),
}));
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
    mockForward.mockResolvedValue({ data: { id: "fwd_123" }, error: null });
  });

  it("forwards inbound email via Resend passthrough API", async () => {
    const payload = {
      type: "email.received",
      data: {
        email_id: "em_abc123",
        from: "sender@example.com",
        to: ["hello@vernix.app"],
        subject: "Test email",
      },
    };

    const { status, data } = await parseJsonResponse(
      await POST(createWebhookRequest(payload))
    );
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockForward).toHaveBeenCalledWith({
      emailId: "em_abc123",
      to: ["admin@example.com"],
      from: "Vernix <hello@vernix.app>",
    });
  });

  it("forwards to multiple recipients", async () => {
    vi.stubEnv("EMAIL_FORWARD_TO", "a@example.com, b@example.com");

    const payload = {
      type: "email.received",
      data: {
        email_id: "em_abc123",
        from: "sender@example.com",
        to: ["hello@vernix.app"],
        subject: "Test",
      },
    };

    await POST(createWebhookRequest(payload));

    expect(mockForward).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["a@example.com", "b@example.com"],
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
    expect(mockForward).not.toHaveBeenCalled();
  });

  it("skips inbound email with missing email_id/from/subject", async () => {
    const { status, data } = await parseJsonResponse(
      await POST(
        createWebhookRequest({
          type: "email.received",
          data: { from: "a@b.com" },
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
          data: {
            email_id: "em_123",
            from: "a@b.com",
            subject: "Test",
          },
        })
      )
    );
    expect(status).toBe(200);
    expect(data.received).toBe(true);
    expect(mockForward).not.toHaveBeenCalled();
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

  it("returns 500 when Resend forward fails", async () => {
    mockForward.mockResolvedValueOnce({
      data: null,
      error: { message: "forward failed", name: "api_error" },
    });

    const { status } = await parseJsonResponse(
      await POST(
        createWebhookRequest({
          type: "email.received",
          data: {
            email_id: "em_123",
            from: "a@b.com",
            subject: "Test",
          },
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

  it("returns 503 when Resend client is not configured", async () => {
    const { getResend } = await import("@/lib/email/client");
    vi.mocked(getResend).mockReturnValueOnce(null);

    const { status } = await parseJsonResponse(
      await POST(
        createWebhookRequest({
          type: "email.received",
          data: {
            email_id: "em_123",
            from: "a@b.com",
            subject: "Test",
          },
        })
      )
    );
    expect(status).toBe(503);
  });
});
