import { getQdrantClient } from "./client";

const EMBEDDING_DIM = 1536; // text-embedding-3-small

export async function createMeetingCollection(name: string) {
  const client = getQdrantClient();
  await client.createCollection(name, {
    vectors: { size: EMBEDDING_DIM, distance: "Cosine" },
  });
}

export async function deleteMeetingCollection(name: string) {
  const client = getQdrantClient();
  await client.deleteCollection(name);
}
