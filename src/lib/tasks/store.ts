import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import type { ExtractedTask } from "./extract";

/**
 * Store extracted action items for a meeting.
 * Only deletes previously auto-extracted tasks — manually created tasks are preserved.
 * Uses a transaction with an advisory lock to prevent duplicates from
 * concurrent extraction (e.g., agent/stop + webhook transcript.done race).
 */
export async function storeExtractedTasks(
  meetingId: string,
  userId: string,
  items: ExtractedTask[]
): Promise<void> {
  await db.transaction(async (tx) => {
    // Advisory lock on meeting ID to serialize concurrent extractions
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${meetingId}))`);

    // Clear only auto-extracted tasks, not manually created ones
    await tx
      .delete(tasks)
      .where(
        and(eq(tasks.meetingId, meetingId), eq(tasks.autoExtracted, true))
      );

    if (items.length === 0) return;

    await tx.insert(tasks).values(
      items.map((item) => ({
        meetingId,
        userId,
        title: item.title,
        assignee: item.assignee,
        sourceText: item.sourceText ?? null,
        sourceTimestampMs: item.sourceTimestampMs ?? null,
        autoExtracted: true,
      }))
    );
  });
}
