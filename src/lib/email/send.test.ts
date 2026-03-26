const { mockResendSend, noClient } = vi.hoisted(() => ({
  mockResendSend: vi.fn(),
  noClient: { value: false },
}));

vi.mock("./client", () => ({
  getResend: () =>
    noClient.value ? null : { emails: { send: mockResendSend } },
}));

import { sendEmail } from "./send";

describe("sendEmail", () => {
  it("sends email via Resend", async () => {
    mockResendSend.mockResolvedValueOnce({
      data: { id: "msg-1" },
      error: null,
    });

    const result = await sendEmail({
      to: "test@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
    });

    expect(result.success).toBe(true);
    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["test@example.com"],
        subject: "Test",
      })
    );
  });

  it("returns error when Resend fails", async () => {
    mockResendSend.mockResolvedValueOnce({
      data: null,
      error: { message: "Bad request" },
    });

    const result = await sendEmail({
      to: "test@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Bad request");
  });

  it("no-ops when Resend is not configured", async () => {
    noClient.value = true;

    const result = await sendEmail({
      to: "test@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
    });

    expect(result.success).toBe(true);
    expect(mockResendSend).not.toHaveBeenCalled();

    noClient.value = false;
  });
});
