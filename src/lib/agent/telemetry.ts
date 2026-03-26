import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export interface MeetingTelemetry {
  activationCount: number;
  totalConnectedMs: number;
  sessionDurations: number[];
  lastActivatedAt: number;
}

export interface FlushedTelemetry {
  activationCount: number;
  totalConnectedSeconds: number;
  avgSessionSeconds: number;
}

const telemetryMap = new Map<string, MeetingTelemetry>();

export function recordActivation(meetingId: string): void {
  let entry = telemetryMap.get(meetingId);
  if (!entry) {
    entry = {
      activationCount: 0,
      totalConnectedMs: 0,
      sessionDurations: [],
      lastActivatedAt: 0,
    };
    telemetryMap.set(meetingId, entry);
  }
  entry.activationCount++;
  entry.lastActivatedAt = Date.now();
}

export function recordSessionEnd(meetingId: string, durationMs: number): void {
  let entry = telemetryMap.get(meetingId);
  if (!entry) {
    entry = {
      activationCount: 0,
      totalConnectedMs: 0,
      sessionDurations: [],
      lastActivatedAt: 0,
    };
    telemetryMap.set(meetingId, entry);
  }
  entry.totalConnectedMs += durationMs;
  entry.sessionDurations.push(durationMs);
}

export async function flushTelemetry(
  meetingId: string,
  userId: string
): Promise<FlushedTelemetry | null> {
  const entry = telemetryMap.get(meetingId);
  if (!entry || entry.activationCount === 0) {
    // eslint-disable-next-line drizzle/enforce-delete-with-where -- Map.delete
    telemetryMap.delete(meetingId);
    return null;
  }

  const totalConnectedSeconds = Math.round(entry.totalConnectedMs / 1000);
  const avgSessionSeconds =
    entry.sessionDurations.length > 0
      ? Math.round(
          entry.sessionDurations.reduce((a, b) => a + b, 0) /
            entry.sessionDurations.length /
            1000
        )
      : 0;

  const flushed: FlushedTelemetry = {
    activationCount: entry.activationCount,
    totalConnectedSeconds,
    avgSessionSeconds,
  };

  const [meeting] = await db
    .select({ metadata: meetings.metadata })
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId)));

  if (meeting) {
    const metadata = (meeting.metadata ?? {}) as Record<string, unknown>;
    await db
      .update(meetings)
      .set({
        metadata: { ...metadata, voiceTelemetry: flushed },
        updatedAt: new Date(),
      })
      .where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId)));
  }

  // eslint-disable-next-line drizzle/enforce-delete-with-where -- Map.delete
  telemetryMap.delete(meetingId);
  return flushed;
}

/** Clear all telemetry (for testing). */
export function resetTelemetry(): void {
  telemetryMap.clear();
}
