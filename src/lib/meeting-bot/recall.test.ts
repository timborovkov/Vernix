import { RecallProvider } from "./recall";

describe("RecallProvider", () => {
  beforeEach(() => {
    vi.stubEnv("RECALL_API_KEY", "test-key");
    vi.stubEnv("RECALL_API_URL", "https://eu-central-1.recall.ai/api/v1");
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
      "https://eu-central-1.recall.ai/api/v1/bot",
      expect.objectContaining({ method: "POST" })
    );

    // Verify the bot config body structure
    const fetchCall = mockFetch.mock.calls[0];
    const body = JSON.parse(fetchCall[1]!.body as string);
    expect(body.meeting_url).toBe("https://meet.google.com/abc");
    expect(body.bot_name).toBe("Vernix Agent");
    expect(body.metadata).toEqual({ meetingId: "meeting-1" });
    expect(body.recording_config.transcript.provider).toEqual({
      recallai_streaming: {},
    });
    expect(body.recording_config.include_bot_in_recording).toEqual({
      audio: true,
    });
    expect(body.recording_config.realtime_endpoints).toEqual([
      expect.objectContaining({
        type: "webhook",
        events: ["transcript.data"],
      }),
    ]);
    // Voice mode should include output_media
    expect(body.output_media).toBeDefined();
    expect(body.output_media.camera.kind).toBe("webpage");
    // Should return voiceSecret in voice mode
    expect(result.voiceSecret).toBeDefined();
    expect(typeof result.voiceSecret).toBe("string");
  });

  it("joinMeeting in silent mode omits output_media and voiceSecret", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "recall-bot-silent" }), { status: 200 })
    );

    const provider = new RecallProvider();
    const result = await provider.joinMeeting(
      "https://meet.google.com/abc",
      "meeting-2",
      undefined,
      { silent: true }
    );

    expect(result.botId).toBe("recall-bot-silent");
    expect(result.voiceSecret).toBeUndefined();

    const fetchCall = mockFetch.mock.calls[0];
    const body = JSON.parse(fetchCall[1]!.body as string);
    expect(body.output_media).toBeUndefined();
    expect(body.recording_config.include_bot_in_recording).toEqual({
      audio: false,
    });
  });

  it("joinMeeting uses custom bot name when userName provided", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "recall-bot-named" }), { status: 200 })
    );

    const provider = new RecallProvider();
    await provider.joinMeeting(
      "https://meet.google.com/abc",
      "meeting-3",
      "Alice"
    );

    const fetchCall = mockFetch.mock.calls[0];
    const body = JSON.parse(fetchCall[1]!.body as string);
    expect(body.bot_name).toBe("Alice's Vernix Agent");
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
      "https://eu-central-1.recall.ai/api/v1/bot/bot-42/leave_call",
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
