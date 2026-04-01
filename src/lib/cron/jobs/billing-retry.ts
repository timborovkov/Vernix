import { db } from "@/lib/db";
import { usageEvents, users } from "@/lib/db/schema";
import { and, eq, gte, isNotNull, isNull, sql } from "drizzle-orm";
import { syncUsageToPolar } from "@/lib/billing/usage";

/**
 * Retry failed Polar metered usage ingests.
 * Finds usage_events from the last 7 days that were never synced to Polar
 * (polarSyncedAt IS NULL) and re-attempts the sync via syncUsageToPolar.
 * Only includes events for users with a polarCustomerId (Pro/trial users).
 */
export async function runBillingRetry() {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days

  const unsynced = await db
    .select({
      id: usageEvents.id,
      userId: usageEvents.userId,
      meetingId: usageEvents.meetingId,
      type: usageEvents.type,
      quantity: usageEvents.quantity,
    })
    .from(usageEvents)
    .innerJoin(users, eq(usageEvents.userId, users.id))
    .where(
      and(
        isNull(usageEvents.polarSyncedAt),
        isNotNull(usageEvents.meetingId),
        isNotNull(users.polarCustomerId),
        gte(usageEvents.createdAt, cutoff),
        sql`${usageEvents.type} IN ('voice_meeting', 'silent_meeting')`
      )
    )
    .limit(50);

  if (unsynced.length === 0) return { retried: 0 };

  let retried = 0;

  for (const event of unsynced) {
    if (!event.meetingId) continue;

    const synced = await syncUsageToPolar(
      event.userId,
      event.meetingId,
      event.type as "voice_meeting" | "silent_meeting",
      Number(event.quantity)
    );
    if (synced) {
      retried++;
    }
  }

  if (retried > 0) {
    console.log(`[Billing Retry] Re-synced ${retried} usage events to Polar`);
  }
  return { retried };
}
