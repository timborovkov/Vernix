import { randomUUID } from "crypto";
import { getQdrantClient } from "./client";
import { createEmbeddings } from "@/lib/openai/embeddings";
import { chunkText } from "@/lib/knowledge/chunk";

/**
 * Upsert agenda text into a meeting's Qdrant collection.
 * Deletes any existing agenda points first, then batch embeds and upserts new ones.
 */
export async function upsertAgenda(
  collectionName: string,
  agendaText: string
): Promise<void> {
  const client = getQdrantClient();

  // Delete existing agenda points
  // eslint-disable-next-line drizzle/enforce-delete-with-where -- Qdrant client, not Drizzle
  await client.delete(collectionName, {
    filter: {
      must: [{ key: "type", match: { value: "agenda" } }],
    },
  });

  const trimmed = agendaText.trim();
  if (!trimmed) return;

  const chunks = chunkText(trimmed);
  const vectors = await createEmbeddings(chunks.map((c) => c.text));

  const points = chunks.map((chunk, i) => ({
    id: randomUUID(),
    vector: vectors[i],
    payload: {
      text: chunk.text,
      type: "agenda",
      speaker: "Agenda",
      timestamp_ms: 0,
    },
  }));

  await client.upsert(collectionName, { points });
}
