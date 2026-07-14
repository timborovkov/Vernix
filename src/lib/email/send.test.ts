const { mockResendSend, noClient, mockFilter } = vi.hoisted(() => ({
  mockResendSend: vi.fn(),
  noClient: { value: false },
  mockFilter: vi.fn(),
}));

vi.mock("./client", () => ({
  getResend: () =>
    noClient.value ? null : { emails: { send: mockResendSend } },
}));
vi.mock("./suppression", () => ({
  filterSuppressedEmails: mockFilter,
}));

import { sendEmail } from "./send";

beforeEach(() => {
  mockFilter.mockImplementation(async (to: string[]) => ({
    allowed: to,
    suppressed: [],
  }));
  mockResendSend.mockReset();
});

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

    expect(result).toEqual({ success: true, status: "sent" });
    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["test@example.com"],
        subject: "Test",
      })
    );
  });

  it("passes a stable idempotency key to Resend retry options", async () => {
    mockResendSend.mockResolvedValueOnce({
      data: { id: "msg-1" },
      error: null,
    });

    const result = await sendEmail({
      to: "test@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
      idempotencyKey: "upgrade-reminder/user-1/initial",
    });

    expect(result).toEqual({ success: true, status: "sent" });
    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: ["test@example.com"] }),
      { idempotencyKey: "upgrade-reminder/user-1/initial" }
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

    expect(result).toEqual({
      success: false,
      status: "failed",
      error: "Bad request",
    });
  });

  it("no-ops when Resend is not configured", async () => {
    noClient.value = true;

    const result = await sendEmail({
      to: "test@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
    });

    expect(result).toEqual({ success: true, status: "skipped" });
    expect(mockResendSend).not.toHaveBeenCalled();

    noClient.value = false;
  });

  it("short-circuits when all recipients are suppressed", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    mockFilter.mockResolvedValueOnce({
      allowed: [],
      suppressed: ["blocked@example.com"],
    });

    const result = await sendEmail({
      to: "blocked@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
    });

    expect(result).toEqual({ success: true, status: "suppressed" });
    expect(mockResendSend).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      "[Email] Skipping 1 suppressed recipient(s) (Test)"
    );
    expect(logSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("blocked@example.com")
    );
    logSpy.mockRestore();
  });

  it("falls open and still sends when the suppression check throws", async () => {
    mockFilter.mockRejectedValueOnce(new Error("db down"));
    mockResendSend.mockResolvedValueOnce({ data: { id: "msg" }, error: null });

    const result = await sendEmail({
      to: "test@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
    });

    expect(result).toEqual({ success: true, status: "sent" });
    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: ["test@example.com"] })
    );
  });

  it("drops suppressed addresses from mixed to lists", async () => {
    mockFilter.mockResolvedValueOnce({
      allowed: ["ok@example.com"],
      suppressed: ["blocked@example.com"],
    });
    mockResendSend.mockResolvedValueOnce({ data: { id: "msg" }, error: null });

    const result = await sendEmail({
      to: ["ok@example.com", "blocked@example.com"],
      subject: "Test",
      html: "<p>Hello</p>",
    });

    expect(result).toEqual({ success: true, status: "sent" });
    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: ["ok@example.com"] })
    );
  });
});
