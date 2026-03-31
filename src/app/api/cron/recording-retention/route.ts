import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { and, eq, lte, sql } from "drizzle-orm";
import { deleteFile } from "@/lib/storage/operations";
import { getMeetingBotProvider } from "@/lib/meeting-bot";

/**
 * Cron endpoint: deletes recordings past the retention period.
 * Runs daily at 03:00 UTC. Protected by CRON_SECRET.
 *
 * Default retention: 90 days (configurable via RECORDING_RETENTION_DAYS).
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const secret = request.headers.get("authorization");
  if (!cronSecret || secret !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const retentionDays = Number(process.env.RECORDING_RETENTION_DAYS) || 90;
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const expired = await db
    .select({
      id: meetings.id,
      userId: meetings.userId,
      metadata: meetings.metadata,
    })
    .from(meetings)
    .where(
      and(
        eq(meetings.status, "completed"),
        sql`${meetings.metadata}->>'recordingKey' IS NOT NULL`,
        lte(meetings.endedAt, cutoff)
      )
    )
    .limit(50);

  let deleted = 0;
  const provider = getMeetingBotProvider();

  for (const m of expired) {
    const metadata = (m.metadata as Record<string, unknown>) ?? {};
    const recordingKey = metadata.recordingKey as string;
    const botId = metadata.botId as string | undefined;

    // Delete S3 recording
    try {
      await deleteFile(recordingKey);
    } catch (err) {
      console.error(`[Recording Retention] S3 delete failed for ${m.id}:`, err);
    }

    // Delete Recall bot if still referenced
    if (botId && provider.deleteBot) {
      try {
        await provider.deleteBot(botId);
      } catch {
        // Bot likely already gone
      }
    }

    // Clear recordingKey from metadata
    const updatedMetadata = { ...metadata };
    delete updatedMetadata.recordingKey;
    await db
      .update(meetings)
      .set({
        metadata: updatedMetadata,
        updatedAt: new Date(),
      })
      .where(and(eq(meetings.id, m.id), eq(meetings.userId, m.userId!)));

    console.log(`[Recording Retention] Deleted recording for meeting ${m.id}`);
    deleted++;
  }

  console.log(
    `[Recording Retention] Deleted ${deleted} recordings (retention: ${retentionDays}d)`
  );
  return NextResponse.json({ deleted, retentionDays });
}
