const { mockDb, mockTranscriptionsCreate } = vi.hoisted(() => {
  const db: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of [
    "select",
    "from",
    "where",
    "orderBy",
    "insert",
    "values",
    "returning",
    "update",
    "set",
    "delete",
  ]) {
    db[m] = vi.fn().mockImplementation(() => db);
  }
  return {
    mockDb: db,
    mockTranscriptionsCreate: vi.fn().mockResolvedValue({ text: "" }),
  };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/openai/client", () => ({
  getOpenAIClient: () => ({
    audio: {
      transcriptions: { create: mockTranscriptionsCreate },
    },
  }),
}));
vi.mock("@/lib/agent/telemetry", () => ({
  recordActivation: vi.fn(),
  recordWakeDetectCall: vi.fn(),
}));

import { POST } from "./route";
import { createJsonRequest, parseJsonResponse } from "@/test/helpers";
import { resetRateLimits } from "@/lib/rate-limit";

const URL = "http://localhost/api/agent/wake-detect";
const VALID_AUDIO = btoa("fake-audio-data");

function meetingRow(overrides: Record<string, unknown> = {}) {
  return {
    metadata: { voiceSecret: "valid-secret", botId: "bot-1" },
    userId: "user-1",
    ...overrides,
  };
}

describe("POST /api/agent/wake-detect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimits();
    mockTranscriptionsCreate.mockResolvedValue({ text: "" });
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new Request(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
    expect(data.error).toBe("Invalid JSON body");
  });

  it("returns 400 for missing fields", async () => {
    const req = createJsonRequest(URL, {
      method: "POST",
      body: { meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" },
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(400);
  });

  it("returns 404 when meeting not found", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        botSecret: "valid-secret",
        audio: VALID_AUDIO,
      },
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(404);
  });

  it("returns 403 for invalid bot secret", async () => {
    mockDb.where.mockResolvedValueOnce([
      meetingRow({ metadata: { voiceSecret: "correct-secret" } }),
    ]);

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        botSecret: "wrong-secret",
        audio: VALID_AUDIO,
      },
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(403);
  });

  it("returns activated: false when no wake word", async () => {
    mockDb.where.mockResolvedValueOnce([meetingRow()]);
    mockTranscriptionsCreate.mockResolvedValueOnce({
      text: "Let's discuss the roadmap",
    });

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        botSecret: "valid-secret",
        audio: VALID_AUDIO,
      },
    });
    const { status, data } = await parseJsonResponse(await POST(req));

    expect(status).toBe(200);
    expect(data.activated).toBe(false);
    expect(mockTranscriptionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "gpt-4o-mini-transcribe" })
    );
  });

  it("returns activated: true when wake word detected", async () => {
    mockDb.where
      .mockResolvedValueOnce([meetingRow()])
      .mockResolvedValueOnce(undefined);
    mockTranscriptionsCreate.mockResolvedValueOnce({
      text: "Hey Vernix what time is it",
    });

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        botSecret: "valid-secret",
        audio: VALID_AUDIO,
      },
    });
    const { status, data } = await parseJsonResponse(await POST(req));

    expect(status).toBe(200);
    expect(data.activated).toBe(true);
    expect(data.transcriptWindow).toBe("Hey Vernix what time is it");

    const { recordActivation } = await import("@/lib/agent/telemetry");
    expect(recordActivation).toHaveBeenCalledWith(
      "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
    );
  });

  it("detects fuzzy vernix variants", async () => {
    mockDb.where
      .mockResolvedValueOnce([meetingRow()])
      .mockResolvedValueOnce(undefined);
    mockTranscriptionsCreate.mockResolvedValueOnce({
      text: "Hey varnix how are you",
    });

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        botSecret: "valid-secret",
        audio: VALID_AUDIO,
      },
    });
    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(200);
    expect(data.activated).toBe(true);
  });

  it("skips activation when already responding", async () => {
    mockDb.where.mockResolvedValueOnce([
      meetingRow({
        metadata: {
          voiceSecret: "valid-secret",
          voiceActivation: { state: "responding" },
        },
      }),
    ]);

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        botSecret: "valid-secret",
        audio: VALID_AUDIO,
      },
    });
    const { status, data } = await parseJsonResponse(await POST(req));
    expect(status).toBe(200);
    expect(data.activated).toBe(false);
    expect(mockTranscriptionsCreate).not.toHaveBeenCalled();
  });

  it("rate limits requests", async () => {
    const { rateLimit: rl } = await import("@/lib/rate-limit");
    for (let i = 0; i < 60; i++) {
      rl("agent:wake-detect:unknown", { interval: 60_000, limit: 60 });
    }

    const req = createJsonRequest(URL, {
      method: "POST",
      body: {
        meetingId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        botSecret: "valid-secret",
        audio: VALID_AUDIO,
      },
    });
    const { status } = await parseJsonResponse(await POST(req));
    expect(status).toBe(429);
  });
});
