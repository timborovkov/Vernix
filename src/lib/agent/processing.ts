import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { scrollTranscript } from "@/lib/vector/scroll";
import { generateMeetingSummary } from "@/lib/summary/generate";
import { extractActionItems } from "@/lib/tasks/extract";
import { storeExtractedTasks } from "@/lib/tasks/store";

/**
 * Shared post-meeting processing: generate summary and extract action items.
 * Used by the stop route, leave endpoint, and status webhook (transcript.done).
 */
export async function processMeetingEnd(
  meetingId: string,
  userId: string,
  qdrantCollectionName: string,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    const segments = await scrollTranscript(qdrantCollectionName);
    const summary = await generateMeetingSummary(segments, {
      title: (metadata.title as string) ?? undefined,
      startedAt: (metadata.startedAt as Date) ?? undefined,
      participants: (metadata.participants as string[]) ?? [],
      agenda: (metadata.agenda as string) ?? undefined,
    });

    await db
      .update(meetings)
      .set({
        status: "completed",
        metadata: { ...metadata, summary },
        updatedAt: new Date(),
      })
      .where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId)));

    // Extract action items (non-critical)
    try {
      const items = await extractActionItems(segments);
      await storeExtractedTasks(meetingId, userId, items);
    } catch (err) {
      console.error("Action item extraction failed:", err);
    }
  } catch (error) {
    console.error("Post-processing failed:", error);
    // Still complete on failure, just without summary
    await db
      .update(meetings)
      .set({ status: "completed", updatedAt: new Date() })
      .where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId)));
  }
}
