import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getQdrantClient } from "@/lib/vector/client";
import { createEmbedding } from "@/lib/openai/embeddings";

const MAX_CONCURRENT = 5;

export class MeetingNotFoundError extends Error {
  constructor(meetingId: string) {
    super(`Meeting not found: ${meetingId}`);
    this.name = "MeetingNotFoundError";
  }
}

export class EmbeddingError extends Error {
  constructor(cause: unknown) {
    super(
      `Failed to create embedding: ${cause instanceof Error ? cause.message : "Unknown error"}`
    );
    this.name = "EmbeddingError";
  }
}

export class AllSearchesFailedError extends Error {
  constructor() {
    super("Vector search failed for all collections");
    this.name = "AllSearchesFailedError";
  }
}

export interface RAGResult {
  text: string;
  speaker: string;
  timestampMs: number;
  score: number;
  meetingId: string;
}

export interface RAGOptions {
  meetingId?: string;
  /** Filter to only this user's meetings (required for multi-user). */
  userId: string;
  limit?: number;
  scoreThreshold?: number;
  /** Boost results from this meeting so they rank higher. */
  boostMeetingId?: string;
  /** Multiplier applied to boosted meeting scores (default 1.15). */
  boostFactor?: number;
}

/**
 * Search Qdrant for relevant transcript context.
 *
 * Throws MeetingNotFoundError, EmbeddingError, or AllSearchesFailedError.
 * Callers that want graceful degradation should catch these.
 */
export async function getRAGContext(
  query: string,
  options: RAGOptions
): Promise<RAGResult[]> {
  const limit = options.limit ?? 10;
  const scoreThreshold = options.scoreThreshold ?? 0;

  let collectionsToSearch: { collectionName: string; meetingId: string }[];

  if (options.meetingId) {
    const conditions = [eq(meetings.id, options.meetingId)];
    conditions.push(eq(meetings.userId, options.userId));

    const [meeting] = await db
      .select()
      .from(meetings)
      .where(and(...conditions));

    if (!meeting) {
      throw new MeetingNotFoundError(options.meetingId);
    }

    collectionsToSearch = [
      { collectionName: meeting.qdrantCollectionName, meetingId: meeting.id },
    ];
  } else {
    const conditions = [inArray(meetings.status, ["active", "completed"])];
    conditions.push(eq(meetings.userId, options.userId));

    const searchable = await db
      .select()
      .from(meetings)
      .where(and(...conditions));

    collectionsToSearch = searchable.map((m) => ({
      collectionName: m.qdrantCollectionName,
      meetingId: m.id,
    }));
  }

  if (collectionsToSearch.length === 0) {
    return [];
  }

  let queryVector: number[];
  try {
    queryVector = await createEmbedding(query);
  } catch (error) {
    throw new EmbeddingError(error);
  }

  const client = getQdrantClient();
  const allHits: RAGResult[] = [];
  let totalSearched = 0;
  let totalFailed = 0;

  for (let i = 0; i < collectionsToSearch.length; i += MAX_CONCURRENT) {
    const batch = collectionsToSearch.slice(i, i + MAX_CONCURRENT);
    const outcomes = await Promise.all(
      batch.map(async ({ collectionName, meetingId: mId }) => {
        try {
          const results = await client.search(collectionName, {
            vector: queryVector,
            limit,
            with_payload: true,
          });

          return {
            hits: results.map((hit) => {
              const payload = hit.payload as Record<string, unknown>;
              return {
                text: payload.text as string,
                speaker: payload.speaker as string,
                timestampMs: payload.timestamp_ms as number,
                score: hit.score,
                meetingId: mId,
              };
            }),
            failed: false,
          };
        } catch {
          return { hits: [] as RAGResult[], failed: true };
        }
      })
    );

    for (const outcome of outcomes) {
      totalSearched++;
      if (outcome.failed) totalFailed++;
      allHits.push(...outcome.hits);
    }
  }

  if (totalSearched > 0 && totalFailed === totalSearched) {
    throw new AllSearchesFailedError();
  }

  const boostId = options.boostMeetingId;
  const boostFactor = options.boostFactor ?? 1.15;

  return allHits
    .filter((h) => h.score >= scoreThreshold)
    .sort((a, b) => {
      const aScore =
        boostId && a.meetingId === boostId ? a.score * boostFactor : a.score;
      const bScore =
        boostId && b.meetingId === boostId ? b.score * boostFactor : b.score;
      return bScore - aScore;
    })
    .slice(0, limit);
}

export function formatContextForPrompt(results: RAGResult[]): string {
  if (results.length === 0) {
    return "";
  }

  const lines = results.map(
    (r) => `[${r.speaker}] (${r.timestampMs}ms): ${r.text}`
  );

  return `## Relevant meeting context\n\n${lines.join("\n")}`;
}
