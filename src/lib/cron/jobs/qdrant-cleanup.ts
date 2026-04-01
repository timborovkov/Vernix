import { db } from "@/lib/db";
import { meetings, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getQdrantClient } from "@/lib/vector/client";

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

    if (name.startsWith("meeting_")) {
      // Collection name is meeting_<uuid-without-dashes>
      const rawId = name.slice("meeting_".length);
      // Re-insert dashes: 8-4-4-4-12
      const uuid = `${rawId.slice(0, 8)}-${rawId.slice(8, 12)}-${rawId.slice(12, 16)}-${rawId.slice(16, 20)}-${rawId.slice(20)}`;

      const [exists] = await db
        .select({ id: meetings.id })
        .from(meetings)
        .where(eq(meetings.qdrantCollectionName, name))
        .limit(1);

      if (!exists) {
        // Double-check by UUID in case collection name format differs
        const [byId] = await db
          .select({ id: meetings.id })
          .from(meetings)
          .where(eq(meetings.id, uuid))
          .limit(1);

        if (!byId) {
          try {
            await qdrant.deleteCollection(name);
            console.log(
              `[Qdrant Cleanup] Deleted orphaned collection: ${name}`
            );
            deleted++;
          } catch (err) {
            console.error(`[Qdrant Cleanup] Failed to delete ${name}:`, err);
          }
        }
      }
    } else if (name.startsWith("knowledge_")) {
      const rawId = name.slice("knowledge_".length);
      const uuid = `${rawId.slice(0, 8)}-${rawId.slice(8, 12)}-${rawId.slice(12, 16)}-${rawId.slice(16, 20)}-${rawId.slice(20)}`;

      const [exists] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, uuid))
        .limit(1);

      if (!exists) {
        try {
          await qdrant.deleteCollection(name);
          console.log(`[Qdrant Cleanup] Deleted orphaned collection: ${name}`);
          deleted++;
        } catch (err) {
          console.error(`[Qdrant Cleanup] Failed to delete ${name}:`, err);
        }
      }
    }
  }

  if (deleted > 0) {
    console.log(`[Qdrant Cleanup] Deleted ${deleted} orphaned collections`);
  }
  return { deleted, scanned: collections.length };
}
