import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  recordActivation,
  recordSessionEnd,
  recordWakeDetectCall,
  flushTelemetry,
  resetTelemetry,
} from "./telemetry";

vi.mock("@/lib/db", () => {
  const mockUpdate = vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  });
  const mockSelect = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ metadata: {} }]),
    }),
  });
  return {
    db: {
      select: mockSelect,
      update: mockUpdate,
    },
  };
});

vi.mock("@/lib/db/schema", () => ({
  meetings: {
    id: "id",
    userId: "userId",
    metadata: "metadata",
    updatedAt: "updatedAt",
  },
}));

beforeEach(() => {
  resetTelemetry();
});

describe("recordActivation", () => {
  it("creates entry and increments count", async () => {
    recordActivation("m1");
    const result = await flushTelemetry("m1", "u1");
    expect(result).not.toBeNull();
    expect(result!.activationCount).toBe(1);
  });

  it("increments count on subsequent calls", async () => {
    recordActivation("m1");
    recordActivation("m1");
    recordActivation("m1");
    const result = await flushTelemetry("m1", "u1");
    expect(result!.activationCount).toBe(3);
  });
});

describe("recordSessionEnd", () => {
  it("accumulates total connected time and session durations", async () => {
    recordActivation("m1");
    recordSessionEnd("m1", 3000);
    recordSessionEnd("m1", 7000);
    const result = await flushTelemetry("m1", "u1");
    expect(result!.totalConnectedSeconds).toBe(10);
  });
});

describe("flushTelemetry", () => {
  it("persists to DB and returns flushed data", async () => {
    recordActivation("m1");
    recordSessionEnd("m1", 6000);

    const result = await flushTelemetry("m1", "u1");

    expect(result).toEqual({
      activationCount: 1,
      totalConnectedSeconds: 6,
      avgSessionSeconds: 6,
      wakeDetectCalls: 0,
    });
  });

  it("clears in-memory data after flush", async () => {
    recordActivation("m1");
    await flushTelemetry("m1", "u1");

    // Second flush should return null — data was cleared
    const second = await flushTelemetry("m1", "u1");
    expect(second).toBeNull();
  });

  it("returns null when no activations recorded", async () => {
    const result = await flushTelemetry("m1", "u1");
    expect(result).toBeNull();
  });

  it("returns null for entry with zero activations", async () => {
    recordSessionEnd("m1", 5000);
    const result = await flushTelemetry("m1", "u1");
    expect(result).toBeNull();

    // Entry should also be cleared
    const second = await flushTelemetry("m1", "u1");
    expect(second).toBeNull();
  });

  it("computes average session seconds correctly", async () => {
    recordActivation("m1");
    recordSessionEnd("m1", 3000);
    recordSessionEnd("m1", 9000);

    const result = await flushTelemetry("m1", "u1");

    expect(result).toEqual({
      activationCount: 1,
      totalConnectedSeconds: 12,
      avgSessionSeconds: 6,
      wakeDetectCalls: 0,
    });
  });
});

describe("recordWakeDetectCall", () => {
  it("tracks wake-detect API calls", async () => {
    recordActivation("m1");
    recordWakeDetectCall("m1");
    recordWakeDetectCall("m1");
    recordWakeDetectCall("m1");
    const result = await flushTelemetry("m1", "u1");
    expect(result!.wakeDetectCalls).toBe(3);
  });
});

describe("resetTelemetry", () => {
  it("clears all entries", async () => {
    recordActivation("m1");
    recordActivation("m2");
    resetTelemetry();
    expect(await flushTelemetry("m1", "u1")).toBeNull();
    expect(await flushTelemetry("m2", "u1")).toBeNull();
  });
});
