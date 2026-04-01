import { db } from "@/lib/db";
import { usageEvents, documents, meetings } from "@/lib/db/schema";
import { and, eq, inArray, isNull, lt, sql } from "drizzle-orm";

/**
 * Clean up orphaned DB records:
 * 1. Old usage_events with null meetingId (from deleted meetings) > 90 days
 * 2. Documents referencing non-existent meetings (re-parent to global knowledge)
 */
export async function runOrphanSweeper() {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days
  let cleaned = 0;

  // 1. Delete old orphaned usage events (meetingId set to null by cascade)
  // Bounded via subquery since PostgreSQL doesn't support LIMIT on DELETE
  try {
    // Only delete meeting-type events that lost their meetingId via cascade.
    // Non-meeting events (rag_query, api_request, doc_upload) legitimately have null meetingId.
    const toDelete = await db
      .select({ id: usageEvents.id })
      .from(usageEvents)
      .where(
        and(
          isNull(usageEvents.meetingId),
          lt(usageEvents.createdAt, cutoff),
          sql`${usageEvents.type} IN ('voice_meeting', 'silent_meeting')`
        )
      )
      .limit(100);

    if (toDelete.length > 0) {
      const ids = toDelete.map((r) => r.id);
      await db.delete(usageEvents).where(inArray(usageEvents.id, ids));
      console.log(
        `[Orphan Sweeper] Deleted ${ids.length} orphaned usage events`
      );
      cleaned += ids.length;
    }
  } catch (err) {
    console.error("[Orphan Sweeper] Usage event cleanup failed:", err);
  }

  // 2. Re-parent documents whose meetingId references a deleted meeting
  try {
    const orphanedDocs = await db
      .select({ id: documents.id, meetingId: documents.meetingId })
      .from(documents)
      .leftJoin(meetings, eq(documents.meetingId, meetings.id))
      .where(and(sql`${documents.meetingId} IS NOT NULL`, isNull(meetings.id)))
      .limit(100);

    let reparented = 0;
    for (const doc of orphanedDocs) {
      try {
        await db
          .update(documents)
          .set({ meetingId: null, updatedAt: new Date() })
          .where(eq(documents.id, doc.id));
        reparented++;
        cleaned++;
      } catch (err) {
        console.error(
          `[Orphan Sweeper] Failed to re-parent document ${doc.id}:`,
          err
        );
      }
    }

    if (reparented > 0) {
      console.log(
        `[Orphan Sweeper] Re-parented ${reparented} orphaned documents`
      );
    }
  } catch (err) {
    console.error("[Orphan Sweeper] Document cleanup failed:", err);
  }

  return { cleaned };
}
