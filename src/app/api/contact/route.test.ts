const { mockSendEmail } = vi.hoisted(() => ({
  mockSendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/email/send", () => ({ sendEmail: mockSendEmail }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitByIp: () => ({ success: true, remaining: 99 }),
}));

import { POST } from "./route";
import { createJsonRequest, parseJsonResponse } from "@/test/helpers";

const URL = "http://localhost/api/contact";

describe("POST /api/contact", () => {
  it("sends contact email successfully", async () => {
    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        topic: "question",
        email: "user@example.com",
        name: "Test User",
        message: "Hello, I have a question.",
      },
    });
    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "hello@vernix.app",
        subject: expect.stringContaining("General question"),
        replyTo: "user@example.com",
      })
    );
  });

  it("returns 400 on missing topic", async () => {
    const req = createJsonRequest(URL, {
      method: "POST",
      body: { email: "user@example.com", message: "Hello" },
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
  });

  it("returns 400 on missing message", async () => {
    const req = createJsonRequest(URL, {
      method: "POST",
      body: { topic: "bug", email: "user@example.com" },
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
  });

  it("returns 400 on invalid email", async () => {
    const req = createJsonRequest(URL, {
      method: "POST",
      body: { topic: "feature", email: "not-email", message: "Hello" },
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
  });

  it("returns 400 on invalid topic", async () => {
    const req = createJsonRequest(URL, {
      method: "POST",
      body: { topic: "invalid", email: "user@example.com", message: "Hello" },
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
  });

  it("returns 500 when email send fails", async () => {
    mockSendEmail.mockResolvedValueOnce({
      success: false,
      error: "Send failed",
    });

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        topic: "question",
        email: "user@example.com",
        message: "Hello",
      },
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(500);
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
