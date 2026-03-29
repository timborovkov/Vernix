import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { scrollTranscript } from "@/lib/vector/scroll";
import { generateMeetingSummary } from "@/lib/summary/generate";
import { extractActionItems } from "@/lib/tasks/extract";
import { storeExtractedTasks } from "@/lib/tasks/store";
import { recordMeetingUsage, syncUsageToPolar } from "@/lib/billing/usage";

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

    // Record meeting usage for billing (non-critical)
    try {
      const startedAt = metadata.startedAt as Date | undefined;
      const endedAt = metadata.endedAt as Date | undefined;
      if (startedAt && endedAt) {
        const durationMs =
          new Date(endedAt).getTime() - new Date(startedAt).getTime();
        const durationMinutes = Math.max(1, Math.round(durationMs / 60000));
        const isSilent = Boolean(metadata.silent);
        const type = isSilent ? "silent_meeting" : "voice_meeting";
        await recordMeetingUsage(userId, meetingId, type, durationMinutes);
        syncUsageToPolar(userId, meetingId, type, durationMinutes).catch(
          (err) => console.error("[Billing] Polar sync failed:", err)
        );
      }
    } catch (err) {
      console.error("[Billing] Usage recording failed:", err);
    }

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
