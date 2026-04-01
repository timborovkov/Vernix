import {
  getRAGContext,
  MeetingNotFoundError,
  EmbeddingError,
  AllSearchesFailedError,
} from "@/lib/agent/rag";
import { NotFoundError, BillingError, SearchError } from "@/lib/api/errors";
import { requireLimits } from "@/lib/billing/enforce";
import { canMakeRagQuery } from "@/lib/billing/limits";
import { getDailyCount, recordUsageEvent } from "@/lib/billing/usage";

// ---------------------------------------------------------------------------
// Semantic search across meetings and knowledge base
// ---------------------------------------------------------------------------

export async function searchMeetings(
  userId: string,
  opts: { query: string; meetingId?: string; limit?: number }
) {
  // Billing check for RAG
  const { limits } = await requireLimits(userId);
  const dailyRag = await getDailyCount(userId, "rag_query");
  const ragCheck = canMakeRagQuery(limits, dailyRag);
  if (!ragCheck.allowed) {
    throw new BillingError(ragCheck.reason!, 429);
  }

  try {
    const ragResults = await getRAGContext(opts.query, {
      meetingId: opts.meetingId,
      limit: opts.limit ?? 10,
      userId,
    });

    // Record usage (fire-and-forget)
    recordUsageEvent(userId, "rag_query").catch((e) =>
      console.error("[Billing] Usage recording failed:", e)
    );

    return ragResults.map((r) => ({
      text: r.text,
      score: r.score,
      source: r.source,
      speaker: r.speaker,
      timestamp_ms: r.timestampMs,
      meetingId: r.meetingId,
      fileName: r.fileName,
      documentId: r.documentId,
    }));
  } catch (error) {
    if (error instanceof MeetingNotFoundError) {
      throw new NotFoundError("Meeting");
    }
    if (error instanceof EmbeddingError) {
      throw new SearchError("Failed to create embedding");
    }
    if (error instanceof AllSearchesFailedError) {
      throw new SearchError("Vector search failed for all collections");
    }
    throw error;
  }
}
