describe("getMeetingBotProvider", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns MockProvider when env is 'mock'", async () => {
    vi.stubEnv("MEETING_BOT_PROVIDER", "mock");
    const [{ getMeetingBotProvider }, { MockProvider }] = await Promise.all([
      import("./index"),
      import("./mock"),
    ]);
    const provider = getMeetingBotProvider();
    expect(provider).toBeInstanceOf(MockProvider);
  });

  it("returns RecallProvider when env is 'recall'", async () => {
    vi.stubEnv("MEETING_BOT_PROVIDER", "recall");
    const [{ getMeetingBotProvider }, { RecallProvider }] = await Promise.all([
      import("./index"),
      import("./recall"),
    ]);
    const provider = getMeetingBotProvider();
    expect(provider).toBeInstanceOf(RecallProvider);
  });

  it("throws on unknown provider", async () => {
    vi.stubEnv("MEETING_BOT_PROVIDER", "unknown");
    const { getMeetingBotProvider } = await import("./index");
    expect(() => getMeetingBotProvider()).toThrow(
      "Unknown meeting bot provider"
    );
  });
});
