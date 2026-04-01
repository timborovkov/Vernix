import { db } from "@/lib/db";
import { meetings, usageEvents } from "@/lib/db/schema";
import { and, eq, gte, isNull, sql } from "drizzle-orm";
import { recordMeetingUsage } from "@/lib/billing/usage";

/**
 * Detect completed meetings missing usage_events and backfill them.
 * Catches cases where billing recording failed silently during processing.
 */
export async function runUsageAudit() {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000); // last 48 hours

  // Find completed meetings with startedAt/endedAt but no usage event
  const missing = await db
    .select({
      id: meetings.id,
      userId: meetings.userId,
      startedAt: meetings.startedAt,
      endedAt: meetings.endedAt,
      metadata: meetings.metadata,
    })
    .from(meetings)
    .leftJoin(
      usageEvents,
      and(
        eq(usageEvents.meetingId, meetings.id),
        sql`${usageEvents.type} IN ('voice_meeting', 'silent_meeting')`
      )
    )
    .where(
      and(
        eq(meetings.status, "completed"),
        gte(meetings.endedAt, cutoff),
        isNull(usageEvents.id)
      )
    )
    .limit(50);

  let repaired = 0;
  for (const m of missing) {
    if (!m.userId || !m.startedAt || !m.endedAt) continue;

    const durationMs =
      new Date(m.endedAt).getTime() - new Date(m.startedAt).getTime();
    const durationMinutes = Math.max(1, Math.round(durationMs / 60000));
    const metadata = (m.metadata as Record<string, unknown>) ?? {};
    const isSilent = Boolean(metadata.silent);
    const type = isSilent ? "silent_meeting" : "voice_meeting";

    try {
      await recordMeetingUsage(m.userId, m.id, type, durationMinutes);
      repaired++;
    } catch (err) {
      console.error(`[Usage Audit] Failed to backfill meeting ${m.id}:`, err);
    }
  }

  if (repaired > 0) {
    console.log(`[Usage Audit] Backfilled ${repaired} missing usage events`);
  }
  return { repaired };
}
