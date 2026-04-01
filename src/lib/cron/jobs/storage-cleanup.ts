import { db } from "@/lib/db";
import { documents, meetings } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { listObjects, deleteFile } from "@/lib/storage/operations";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Remove orphaned S3 objects that no longer have matching DB records.
 * Scans knowledge/ and recordings/ prefixes.
 */
export async function runStorageCleanup() {
  let deleted = 0;
  const maxDeletions = 30;

  // 1. Orphaned knowledge files
  try {
    const knowledgeKeys = await listObjects("knowledge/", 500);
    for (const key of knowledgeKeys) {
      if (deleted >= maxDeletions) break;

      try {
        // Key pattern: knowledge/<userId>/<docId>/filename
        const parts = key.split("/");
        if (parts.length < 3) continue;
        const docId = parts[2];

        const [byKey] = await db
          .select({ id: documents.id })
          .from(documents)
          .where(eq(documents.s3Key, key))
          .limit(1);

        if (!byKey) {
          // Double check by docId if it's a valid UUID
          let foundById = false;
          if (UUID_RE.test(docId)) {
            const [byId] = await db
              .select({ id: documents.id })
              .from(documents)
              .where(eq(documents.id, docId))
              .limit(1);
            foundById = !!byId;
          }

          if (!foundById) {
            await deleteFile(key);
            console.log(`[Storage Cleanup] Deleted orphaned file: ${key}`);
            deleted++;
          }
        }
      } catch (err) {
        console.error(`[Storage Cleanup] Failed to process ${key}:`, err);
      }
    }
  } catch (err) {
    console.error("[Storage Cleanup] Knowledge scan failed:", err);
  }

  // 2. Orphaned recordings
  try {
    const recordingKeys = await listObjects("recordings/", 500);
    for (const key of recordingKeys) {
      if (deleted >= maxDeletions) break;

      try {
        // Key pattern: recordings/<meetingId>.mp4
        const fileName = key.split("/").pop() ?? "";
        const meetingId = fileName.replace(/\.mp4$/, "");

        const [byMeta] = await db
          .select({ id: meetings.id })
          .from(meetings)
          .where(eq(sql`${meetings.metadata}->>'recordingKey'`, key))
          .limit(1);

        if (!byMeta) {
          // Also check if meeting exists at all (only if valid UUID)
          let meetingExists = false;
          if (UUID_RE.test(meetingId)) {
            const [byId] = await db
              .select({ id: meetings.id })
              .from(meetings)
              .where(eq(meetings.id, meetingId))
              .limit(1);
            meetingExists = !!byId;
          }

          if (!meetingExists) {
            await deleteFile(key);
            console.log(`[Storage Cleanup] Deleted orphaned recording: ${key}`);
            deleted++;
          }
        }
      } catch (err) {
        console.error(`[Storage Cleanup] Failed to process ${key}:`, err);
      }
    }
  } catch (err) {
    console.error("[Storage Cleanup] Recording scan failed:", err);
  }

  if (deleted > 0) {
    console.log(`[Storage Cleanup] Deleted ${deleted} orphaned objects`);
  }
  return { deleted };
}
