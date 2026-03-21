import { randomUUID } from "crypto";
import { getQdrantClient } from "./client";
import { createEmbedding } from "@/lib/openai/embeddings";

export async function upsertTranscriptChunk(
  collectionName: string,
  payload: { text: string; speaker: string; timestampMs: number }
): Promise<string> {
  const id = randomUUID();
  const vector = await createEmbedding(payload.text);
  const client = getQdrantClient();

  await client.upsert(collectionName, {
    points: [
      {
        id,
        vector,
        payload: {
          text: payload.text,
          speaker: payload.speaker,
          timestamp_ms: payload.timestampMs,
          type: "transcript",
        },
      },
    ],
  });

  return id;
}
