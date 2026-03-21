import { RecallProvider } from "./recall";

describe("RecallProvider", () => {
  beforeEach(() => {
    vi.stubEnv("RECALL_API_KEY", "test-key");
    vi.stubEnv("RECALL_API_URL", "https://api.recall.ai/api/v1");
    vi.stubGlobal("fetch", vi.fn());
  });

  it("joinMeeting sends correct request and returns botId", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "recall-bot-42" }), { status: 200 })
    );

    const provider = new RecallProvider();
    const result = await provider.joinMeeting(
      "https://meet.google.com/abc",
      "meeting-1"
    );

    expect(result.botId).toBe("recall-bot-42");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.recall.ai/api/v1/bot",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("joinMeeting throws on non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("Unauthorized", { status: 401 })
    );

    const provider = new RecallProvider();
    await expect(
      provider.joinMeeting("https://meet.google.com/abc", "id")
    ).rejects.toThrow("Recall API error: 401");
  });

  it("leaveMeeting sends POST to correct endpoint", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 200 }));

    const provider = new RecallProvider();
    await provider.leaveMeeting("bot-42");

    expect(fetch).toHaveBeenCalledWith(
      "https://api.recall.ai/api/v1/bot/bot-42/leave_call",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("leaveMeeting throws on non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("Not Found", { status: 404 })
    );

    const provider = new RecallProvider();
    await expect(provider.leaveMeeting("bot-99")).rejects.toThrow(
      "Recall API error: 404"
    );
  });
});
