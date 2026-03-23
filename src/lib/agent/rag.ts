import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getQdrantClient } from "@/lib/vector/client";
import { createEmbedding } from "@/lib/openai/embeddings";
import { knowledgeCollectionName } from "@/lib/vector/knowledge";

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
  score: number;
  source: "transcript" | "document";
  // Transcript-specific
  speaker?: string;
  timestampMs?: number;
  meetingId?: string;
  // Document-specific
  fileName?: string;
  documentId?: string;
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
  /** Search knowledge base in addition to meetings. Default: true. */
  includeKnowledge?: boolean;
}

/**
 * Search Qdrant for relevant transcript and knowledge context.
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

  // Search meeting collections
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
              const type = payload.type as string;

              if (type === "document") {
                return {
                  text: payload.text as string,
                  score: hit.score,
                  source: "document" as const,
                  fileName: payload.file_name as string,
                  documentId: payload.document_id as string,
                  meetingId: mId,
                };
              }

              // transcript and agenda both map as transcript context
              return {
                text: payload.text as string,
                score: hit.score,
                source: "transcript" as const,
                speaker: payload.speaker as string,
                timestampMs: payload.timestamp_ms as number,
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

  // Search knowledge base collection
  if (options.includeKnowledge !== false) {
    const knowledgeCollection = knowledgeCollectionName(options.userId);
    try {
      const results = await client.search(knowledgeCollection, {
        vector: queryVector,
        limit,
        with_payload: true,
      });

      for (const hit of results) {
        const payload = hit.payload as Record<string, unknown>;
        allHits.push({
          text: payload.text as string,
          score: hit.score,
          source: "document",
          fileName: payload.file_name as string,
          documentId: payload.document_id as string,
        });
      }
    } catch {
      // Knowledge collection may not exist yet — not a failure
    }
  }

  if (
    totalSearched > 0 &&
    totalFailed === totalSearched &&
    allHits.length === 0
  ) {
    throw new AllSearchesFailedError();
  }

  const boostId = options.boostMeetingId;
  const boostFactor = options.boostFactor ?? 1.15;

  // Sort by score, boosting the current meeting's transcripts.
  // Knowledge base results (source: "document") compete at raw score — this is
  // intentional so highly relevant docs still surface alongside boosted transcripts.
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

  const sections: string[] = [];

  const transcriptResults = results.filter((r) => r.source === "transcript");
  if (transcriptResults.length > 0) {
    const lines = transcriptResults.map((r) => {
      const speaker = r.speaker ?? "Unknown";
      const time = r.timestampMs != null ? ` (${r.timestampMs}ms)` : "";
      return `[${speaker}]${time}: ${r.text}`;
    });
    sections.push(`## Relevant meeting context\n\n${lines.join("\n")}`);
  }

  const documentResults = results.filter((r) => r.source === "document");
  if (documentResults.length > 0) {
    const lines = documentResults.map((r) => `[${r.fileName}]: ${r.text}`);
    sections.push(`## Relevant knowledge base context\n\n${lines.join("\n")}`);
  }

  return sections.join("\n\n");
}
