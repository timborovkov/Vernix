import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import type { ExtractedTask } from "./extract";

/**
 * Store extracted action items for a meeting.
 * Only deletes previously auto-extracted tasks — manually created tasks are preserved.
 * Wrapped in a transaction to prevent data loss if the insert fails.
 */
export async function storeExtractedTasks(
  meetingId: string,
  userId: string,
  items: ExtractedTask[]
): Promise<void> {
  await db.transaction(async (tx) => {
    // Clear only auto-extracted tasks, not manually created ones
    await tx
      .delete(tasks)
      .where(and(eq(tasks.meetingId, meetingId), eq(tasks.autoExtracted, 1)));

    if (items.length === 0) return;

    await tx.insert(tasks).values(
      items.map((item) => ({
        meetingId,
        userId,
        title: item.title,
        assignee: item.assignee,
        autoExtracted: 1,
      }))
    );
  });
}
