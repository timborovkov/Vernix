import { MockProvider } from "./mock";

describe("MockProvider", () => {
  it("joinMeeting returns a botId containing the meetingId", async () => {
    const provider = new MockProvider();
    const result = await provider.joinMeeting(
      "https://meet.example.com",
      "abc-123"
    );
    expect(result.botId).toBe("mock-bot-abc-123");
  });

  it("leaveMeeting resolves without error", async () => {
    const provider = new MockProvider();
    await expect(
      provider.leaveMeeting("mock-bot-123")
    ).resolves.toBeUndefined();
  });

  it("onTranscript fires callback after delay", () => {
    vi.useFakeTimers();
    const provider = new MockProvider();
    const cb = vi.fn();

    provider.onTranscript("bot-1", cb);
    expect(cb).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2000);
    expect(cb).toHaveBeenCalledWith(
      "Hello, this is a mock transcript.",
      "Mock Speaker",
      expect.any(Number)
    );

    vi.useRealTimers();
  });
});
