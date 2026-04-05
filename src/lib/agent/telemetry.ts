import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";

export interface FlushedTelemetry {
  activationCount: number;
  totalConnectedSeconds: number;
  avgSessionSeconds: number;
  wakeDetectCalls: number;
}

/**
 * Ensure _telemetryAccumulator exists in metadata, then return the metadata
 * expression ready for nested jsonb_set calls.
 *
 * jsonb_set's `create_missing` (4th param) only creates the *leaf* key,
 * not intermediate objects. So we first guarantee the parent object exists
 * via a top-level jsonb_set, then nested paths work reliably.
 */
function withAccumulator() {
  return sql`jsonb_set(
    COALESCE(${meetings.metadata}, '{}'::jsonb),
    '{_telemetryAccumulator}',
    COALESCE(${meetings.metadata}->'_telemetryAccumulator', '{}'::jsonb)
  )`;
}

/**
 * Atomically increment activation count in metadata._telemetryAccumulator.
 * Persists directly to Postgres — safe across serverless invocations.
 */
export async function recordActivation(meetingId: string): Promise<void> {
  await db
    .update(meetings)
    .set({
      metadata: sql`jsonb_set(
        jsonb_set(
          ${withAccumulator()},
          '{_telemetryAccumulator,activationCount}',
          to_jsonb(COALESCE((${meetings.metadata}->'_telemetryAccumulator'->>'activationCount')::int, 0) + 1)
        ),
        '{_telemetryAccumulator,lastActivatedAt}',
        to_jsonb(${Date.now()}::bigint)
      )`,
      updatedAt: new Date(),
    })
    .where(eq(meetings.id, meetingId));
}

/**
 * Atomically record a session end: add duration to totalConnectedMs
 * and append to sessionDurations array.
 */
export async function recordSessionEnd(
  meetingId: string,
  durationMs: number
): Promise<void> {
  await db
    .update(meetings)
    .set({
      metadata: sql`jsonb_set(
        jsonb_set(
          ${withAccumulator()},
          '{_telemetryAccumulator,totalConnectedMs}',
          to_jsonb(COALESCE((${meetings.metadata}->'_telemetryAccumulator'->>'totalConnectedMs')::int, 0) + ${durationMs}::int)
        ),
        '{_telemetryAccumulator,sessionDurations}',
        COALESCE(${meetings.metadata}->'_telemetryAccumulator'->'sessionDurations', '[]'::jsonb) || to_jsonb(${durationMs}::int)
      )`,
      updatedAt: new Date(),
    })
    .where(eq(meetings.id, meetingId));
}

/**
 * Atomically increment wake-detect call count.
 */
export async function recordWakeDetectCall(meetingId: string): Promise<void> {
  await db
    .update(meetings)
    .set({
      metadata: sql`jsonb_set(
        ${withAccumulator()},
        '{_telemetryAccumulator,wakeDetectCalls}',
        to_jsonb(COALESCE((${meetings.metadata}->'_telemetryAccumulator'->>'wakeDetectCalls')::int, 0) + 1)
      )`,
      updatedAt: new Date(),
    })
    .where(eq(meetings.id, meetingId));
}

/**
 * Read the accumulated telemetry from the DB, compute final stats,
 * write voiceTelemetry, and remove the accumulator.
 */
export async function flushTelemetry(
  meetingId: string,
  userId: string
): Promise<FlushedTelemetry | null> {
  const [meeting] = await db
    .select({ metadata: meetings.metadata })
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId)));

  if (!meeting) return null;

  const metadata = (meeting.metadata ?? {}) as Record<string, unknown>;
  const accumulator = metadata._telemetryAccumulator as
    | {
        activationCount?: number;
        totalConnectedMs?: number;
        sessionDurations?: number[];
        wakeDetectCalls?: number;
      }
    | undefined;

  if (
    !accumulator ||
    ((accumulator.activationCount ?? 0) === 0 &&
      (accumulator.wakeDetectCalls ?? 0) === 0)
  ) {
    return null;
  }

  const totalConnectedMs = accumulator.totalConnectedMs ?? 0;
  const sessionDurations = accumulator.sessionDurations ?? [];
  const totalConnectedSeconds = Math.round(totalConnectedMs / 1000);
  const avgSessionSeconds =
    sessionDurations.length > 0
      ? Math.round(
          sessionDurations.reduce((a, b) => a + b, 0) /
            sessionDurations.length /
            1000
        )
      : 0;

  const flushed: FlushedTelemetry = {
    activationCount: accumulator.activationCount ?? 0,
    totalConnectedSeconds,
    avgSessionSeconds,
    wakeDetectCalls: accumulator.wakeDetectCalls ?? 0,
  };

  // Atomically set voiceTelemetry and remove _telemetryAccumulator
  // without overwriting concurrent changes to other metadata keys
  await db
    .update(meetings)
    .set({
      metadata: sql`(COALESCE(${meetings.metadata}, '{}'::jsonb) - '_telemetryAccumulator') || ${JSON.stringify({ voiceTelemetry: flushed })}::jsonb`,
      updatedAt: new Date(),
    })
    .where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId)));

  return flushed;
}
