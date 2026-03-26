import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  recordActivation,
  recordSessionEnd,
  getTelemetry,
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
  it("creates a new entry and increments count", () => {
    recordActivation("m1");
    const t = getTelemetry("m1");
    expect(t).not.toBeNull();
    expect(t!.activationCount).toBe(1);
    expect(t!.lastActivatedAt).toBeGreaterThan(0);
  });

  it("increments count on subsequent calls", () => {
    recordActivation("m1");
    recordActivation("m1");
    recordActivation("m1");
    const t = getTelemetry("m1");
    expect(t!.activationCount).toBe(3);
  });

  it("updates lastActivatedAt on each call", () => {
    recordActivation("m1");
    const first = getTelemetry("m1")!.lastActivatedAt;
    recordActivation("m1");
    const second = getTelemetry("m1")!.lastActivatedAt;
    expect(second).toBeGreaterThanOrEqual(first);
  });
});

describe("recordSessionEnd", () => {
  it("creates a new entry when none exists", () => {
    recordSessionEnd("m1", 5000);
    const t = getTelemetry("m1");
    expect(t).not.toBeNull();
    expect(t!.totalConnectedMs).toBe(5000);
    expect(t!.sessionDurations).toEqual([5000]);
  });

  it("accumulates total connected time", () => {
    recordSessionEnd("m1", 3000);
    recordSessionEnd("m1", 7000);
    const t = getTelemetry("m1");
    expect(t!.totalConnectedMs).toBe(10000);
    expect(t!.sessionDurations).toEqual([3000, 7000]);
  });
});

describe("getTelemetry", () => {
  it("returns null for unknown meeting", () => {
    expect(getTelemetry("unknown")).toBeNull();
  });

  it("returns data for a known meeting", () => {
    recordActivation("m1");
    recordSessionEnd("m1", 2000);
    const t = getTelemetry("m1");
    expect(t).toEqual(
      expect.objectContaining({
        activationCount: 1,
        totalConnectedMs: 2000,
        sessionDurations: [2000],
      })
    );
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
    });
  });

  it("clears in-memory data after flush", async () => {
    recordActivation("m1");
    await flushTelemetry("m1", "u1");

    expect(getTelemetry("m1")).toBeNull();
  });

  it("returns null when no activations recorded", async () => {
    const result = await flushTelemetry("m1", "u1");
    expect(result).toBeNull();
  });

  it("returns null for entry with zero activations", async () => {
    recordSessionEnd("m1", 5000);
    const result = await flushTelemetry("m1", "u1");
    expect(result).toBeNull();
    expect(getTelemetry("m1")).toBeNull();
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
    });
  });
});

describe("resetTelemetry", () => {
  it("clears all entries", () => {
    recordActivation("m1");
    recordActivation("m2");
    resetTelemetry();
    expect(getTelemetry("m1")).toBeNull();
    expect(getTelemetry("m2")).toBeNull();
  });
});
