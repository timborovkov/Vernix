import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDb } = vi.hoisted(() => {
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
  return { mockDb: db };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/db/schema", () => ({
  meetings: {
    id: "id",
    userId: "userId",
    metadata: "metadata",
    updatedAt: "updatedAt",
  },
}));

import {
  recordActivation,
  recordSessionEnd,
  recordWakeDetectCall,
  flushTelemetry,
} from "./telemetry";

beforeEach(() => {
  vi.clearAllMocks();
  // Default: chainable mock
  for (const m of ["select", "from", "where", "update", "set"]) {
    mockDb[m].mockImplementation(() => mockDb);
  }
});

describe("recordActivation", () => {
  it("performs atomic DB update to increment activation count", async () => {
    await recordActivation("m1");

    expect(mockDb.update).toHaveBeenCalled();
    expect(mockDb.set).toHaveBeenCalled();
    expect(mockDb.where).toHaveBeenCalled();
  });
});

describe("recordSessionEnd", () => {
  it("performs atomic DB update to accumulate session duration", async () => {
    await recordSessionEnd("m1", 5000);

    expect(mockDb.update).toHaveBeenCalled();
    expect(mockDb.set).toHaveBeenCalled();
  });
});

describe("recordWakeDetectCall", () => {
  it("performs atomic DB update to increment wake-detect count", async () => {
    await recordWakeDetectCall("m1");

    expect(mockDb.update).toHaveBeenCalled();
    expect(mockDb.set).toHaveBeenCalled();
  });
});

describe("flushTelemetry", () => {
  it("returns null when no accumulator exists in metadata", async () => {
    mockDb.where.mockResolvedValueOnce([{ metadata: {} }]);

    const result = await flushTelemetry("m1", "u1");
    expect(result).toBeNull();
  });

  it("returns null when meeting not found", async () => {
    mockDb.where.mockResolvedValueOnce([]);

    const result = await flushTelemetry("m1", "u1");
    expect(result).toBeNull();
  });

  it("computes flushed telemetry from accumulator and persists", async () => {
    mockDb.where.mockResolvedValueOnce([
      {
        metadata: {
          _telemetryAccumulator: {
            activationCount: 3,
            totalConnectedMs: 12000,
            sessionDurations: [3000, 9000],
            wakeDetectCalls: 5,
          },
          otherField: "keep",
        },
      },
    ]);

    const result = await flushTelemetry("m1", "u1");

    expect(result).toEqual({
      activationCount: 3,
      totalConnectedSeconds: 12,
      avgSessionSeconds: 6,
      wakeDetectCalls: 5,
    });

    // Should persist atomically via SQL (sets voiceTelemetry, removes accumulator)
    expect(mockDb.update).toHaveBeenCalled();
    expect(mockDb.set).toHaveBeenCalled();
  });

  it("returns null when activationCount and wakeDetectCalls are both 0", async () => {
    mockDb.where.mockResolvedValueOnce([
      {
        metadata: {
          _telemetryAccumulator: {
            activationCount: 0,
            totalConnectedMs: 0,
            sessionDurations: [],
            wakeDetectCalls: 0,
          },
        },
      },
    ]);

    const result = await flushTelemetry("m1", "u1");
    expect(result).toBeNull();
  });

  it("handles missing sessionDurations gracefully", async () => {
    mockDb.where.mockResolvedValueOnce([
      {
        metadata: {
          _telemetryAccumulator: {
            activationCount: 1,
            wakeDetectCalls: 0,
          },
        },
      },
    ]);

    const result = await flushTelemetry("m1", "u1");
    expect(result).toEqual({
      activationCount: 1,
      totalConnectedSeconds: 0,
      avgSessionSeconds: 0,
      wakeDetectCalls: 0,
    });
  });
});
