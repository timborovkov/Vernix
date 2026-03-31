import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { scrollTranscript } from "@/lib/vector/scroll";
import { generateMeetingSummary } from "@/lib/summary/generate";
import { extractActionItems } from "@/lib/tasks/extract";
import { storeExtractedTasks } from "@/lib/tasks/store";
import { recordMeetingUsage, syncUsageToPolar } from "@/lib/billing/usage";
import { getMeetingBotProvider } from "@/lib/meeting-bot";
import { uploadFile } from "@/lib/storage/operations";

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

  // Capture recording and participant data from Recall (runs even if summary failed)
  const botId = metadata.botId as string | undefined;
  if (botId) {
    let recordingCaptured = false;
    try {
      recordingCaptured = await captureRecordingAndParticipants(
        meetingId,
        userId,
        botId
      );
    } catch (err) {
      console.error("[Processing] Recording/participant capture failed:", err);
    }

    // Only delete Recall bot if recording was captured (or intentionally skipped).
    // If capture failed, keep the bot so the recording-retention cron or a
    // manual retry can still fetch it.
    if (recordingCaptured) {
      try {
        const provider = getMeetingBotProvider();
        if (provider.deleteBot) {
          await provider.deleteBot(botId);
          console.log(`[Processing] Recall bot ${botId} deleted`);
        }
      } catch (err) {
        console.error(`[Processing] Recall bot ${botId} deletion failed:`, err);
      }
    }
  }
}

/**
 * Fetch recording + participant data from Recall and persist.
 * Returns true if the recording was captured successfully or intentionally
 * skipped (noRecording, no URL, too large). Returns false if a download or
 * upload failed — in that case the Recall bot should NOT be deleted.
 */
async function captureRecordingAndParticipants(
  meetingId: string,
  userId: string,
  botId: string
): Promise<boolean> {
  const provider = getMeetingBotProvider();
  if (!provider.getBot) return true;

  const bot = await provider.getBot(botId);
  const updates: Record<string, unknown> = {};
  let recordingFailed = false;

  // Check if recording storage is disabled for this meeting
  const [meetingRow] = await db
    .select({ metadata: meetings.metadata })
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId)));
  const noRecording = Boolean(
    (meetingRow?.metadata as Record<string, unknown>)?.noRecording
  );

  // Capture recording to S3 (skip files > 200MB to avoid OOM in serverless)
  const MAX_RECORDING_SIZE = 200 * 1024 * 1024;
  const recordingUrl = bot.media_shortcuts?.video_mixed?.data?.download_url;
  if (recordingUrl && !noRecording) {
    try {
      const res = await fetch(recordingUrl);
      if (res.ok) {
        const contentLength = Number(res.headers.get("content-length") ?? "0");
        if (contentLength > MAX_RECORDING_SIZE) {
          console.warn(
            `[Processing] Recording too large (${Math.round(contentLength / 1024 / 1024)}MB), skipping`
          );
        } else {
          const buffer = Buffer.from(await res.arrayBuffer());
          if (buffer.length > MAX_RECORDING_SIZE) {
            console.warn(
              `[Processing] Recording too large after download (${Math.round(buffer.length / 1024 / 1024)}MB), skipping`
            );
          } else {
            const key = `recordings/${meetingId}.mp4`;
            await uploadFile(key, buffer, "video/mp4");
            updates.recordingKey = key;
            console.log(
              `[Processing] Recording saved: ${key} (${Math.round(buffer.length / 1024 / 1024)}MB)`
            );
          }
        }
      }
    } catch (err) {
      console.error("[Processing] Recording download failed:", err);
      recordingFailed = true;
    }
  }

  // Capture participant events
  const recordingId = bot.recordings?.[0]?.id;
  if (recordingId && provider.getParticipantEvents) {
    try {
      const events = await provider.getParticipantEvents(recordingId);
      updates.participantEvents = events.map((p) => ({
        name: p.name,
        email: p.email,
        isHost: p.is_host,
        events: p.events,
      }));
      console.log(`[Processing] Captured ${events.length} participant records`);
    } catch (err) {
      console.error("[Processing] Participant capture failed:", err);
    }
  }

  // Persist to meeting metadata
  if (Object.keys(updates).length > 0) {
    const [current] = await db
      .select({ metadata: meetings.metadata })
      .from(meetings)
      .where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId)));
    if (current) {
      await db
        .update(meetings)
        .set({
          metadata: {
            ...((current.metadata as Record<string, unknown>) ?? {}),
            ...updates,
          },
          updatedAt: new Date(),
        })
        .where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId)));
    }
  }

  return !recordingFailed;
}
