import { randomUUID } from "crypto";
import { getQdrantClient } from "./client";
import { createEmbeddings } from "@/lib/openai/embeddings";

const EMBEDDING_DIM = 1536;

export function knowledgeCollectionName(userId: string): string {
  return `knowledge_${userId.replace(/-/g, "")}`;
}

export async function ensureKnowledgeCollection(
  userId: string
): Promise<string> {
  const name = knowledgeCollectionName(userId);
  const client = getQdrantClient();

  try {
    await client.getCollection(name);
  } catch {
    try {
      await client.createCollection(name, {
        vectors: { size: EMBEDDING_DIM, distance: "Cosine" },
      });
    } catch {
      // Another request may have created it concurrently — verify it exists
      await client.getCollection(name);
    }
  }

  return name;
}

export async function upsertDocumentChunks(
  collectionName: string,
  chunks: {
    text: string;
    documentId: string;
    fileName: string;
    chunkIndex: number;
  }[]
): Promise<string[]> {
  if (chunks.length === 0) return [];

  const texts = chunks.map((c) => c.text);
  const vectors = await createEmbeddings(texts);

  const points = chunks.map((chunk, i) => ({
    id: randomUUID(),
    vector: vectors[i],
    payload: {
      text: chunk.text,
      type: "document",
      document_id: chunk.documentId,
      file_name: chunk.fileName,
      chunk_index: chunk.chunkIndex,
    },
  }));

  const client = getQdrantClient();
  await client.upsert(collectionName, { points });

  return points.map((p) => p.id);
}

export async function deleteDocumentChunks(
  collectionName: string,
  documentId: string
): Promise<void> {
  const client = getQdrantClient();
  // eslint-disable-next-line drizzle/enforce-delete-with-where -- Qdrant client, not Drizzle
  await client.delete(collectionName, {
    filter: {
      must: [{ key: "document_id", match: { value: documentId } }],
    },
  });
}
