import { db } from "@/lib/db";
import { meetings, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getQdrantClient } from "@/lib/vector/client";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Re-insert dashes into a 32-char hex string: 8-4-4-4-12 */
function rawIdToUuid(raw: string): string | null {
  if (raw.length !== 32) return null;
  const uuid = `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
  return UUID_RE.test(uuid) ? uuid : null;
}

/**
 * Delete orphaned Qdrant collections that no longer have matching DB records.
 * meeting_* collections → check meeting exists.
 * knowledge_* collections → check user exists.
 */
export async function runQdrantCleanup() {
  const qdrant = getQdrantClient();
  const { collections } = await qdrant.getCollections();

  let deleted = 0;
  const maxDeletions = 20;

  for (const col of collections) {
    if (deleted >= maxDeletions) break;

    const name = col.name;

    try {
      if (name.startsWith("meeting_")) {
        // Collection name is meeting_<randomUUID> — unrelated to meetings.id,
        // so we can only match by qdrantCollectionName.
        const [exists] = await db
          .select({ id: meetings.id })
          .from(meetings)
          .where(eq(meetings.qdrantCollectionName, name))
          .limit(1);

        if (!exists) {
          await qdrant.deleteCollection(name);
          console.log(`[Qdrant Cleanup] Deleted orphaned collection: ${name}`);
          deleted++;
        }
      } else if (name.startsWith("knowledge_")) {
        const rawId = name.slice("knowledge_".length);
        const uuid = rawIdToUuid(rawId);
        if (!uuid) continue; // non-standard name, skip

        const [exists] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, uuid))
          .limit(1);

        if (!exists) {
          await qdrant.deleteCollection(name);
          console.log(`[Qdrant Cleanup] Deleted orphaned collection: ${name}`);
          deleted++;
        }
      }
    } catch (err) {
      console.error(`[Qdrant Cleanup] Failed to process ${name}:`, err);
    }
  }

  if (deleted > 0) {
    console.log(`[Qdrant Cleanup] Deleted ${deleted} orphaned collections`);
  }
  return { deleted, scanned: collections.length };
}
