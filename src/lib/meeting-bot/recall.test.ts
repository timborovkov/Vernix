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

  it("getBot fetches bot status and returns structured data", async () => {
    const botData = {
      id: "bot-42",
      status_changes: [
        { code: "joining_call", created_at: "2026-01-01T00:00:00Z" },
        { code: "done", created_at: "2026-01-01T01:00:00Z" },
      ],
      recordings: [{ id: "rec-1" }],
      media_shortcuts: {
        video_mixed: {
          data: { download_url: "https://s3.example.com/video.mp4" },
        },
        transcript: {
          data: { download_url: "https://s3.example.com/transcript.json" },
        },
      },
    };
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(botData), { status: 200 })
    );

    const provider = new RecallProvider();
    const result = await provider.getBot("bot-42");

    expect(result.id).toBe("bot-42");
    expect(result.status_changes).toHaveLength(2);
    expect(result.status_changes[1].code).toBe("done");
    expect(result.recordings[0].id).toBe("rec-1");
    expect(result.media_shortcuts.video_mixed?.data?.download_url).toBe(
      "https://s3.example.com/video.mp4"
    );
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "https://eu-central-1.recall.ai/api/v1/bot/bot-42/",
      expect.objectContaining({
        headers: { Authorization: "Token test-key" },
      })
    );
  });

  it("getBot throws on error response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("Not Found", { status: 404 })
    );

    const provider = new RecallProvider();
    await expect(provider.getBot("bot-missing")).rejects.toThrow(
      "Recall API error: 404"
    );
  });

  it("getParticipantEvents fetches and returns participant data", async () => {
    const eventData = {
      results: [
        {
          id: 1,
          name: "Alice",
          is_host: true,
          email: "alice@example.com",
          platform: "zoom",
          events: [
            { type: "participant.join", timestamp: "2026-01-01T00:00:00Z" },
            { type: "participant.leave", timestamp: "2026-01-01T01:00:00Z" },
          ],
        },
        {
          id: 2,
          name: "Bob",
          is_host: false,
          email: null,
          platform: "zoom",
          events: [
            { type: "participant.join", timestamp: "2026-01-01T00:05:00Z" },
          ],
        },
      ],
    };
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(eventData), { status: 200 })
    );

    const provider = new RecallProvider();
    const result = await provider.getParticipantEvents("rec-1");

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Alice");
    expect(result[0].is_host).toBe(true);
    expect(result[0].events).toHaveLength(2);
    expect(result[1].email).toBeNull();
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "https://eu-central-1.recall.ai/api/v1/participant_events/?recording_id=rec-1",
      expect.objectContaining({
        headers: { Authorization: "Token test-key" },
      })
    );
  });
});
