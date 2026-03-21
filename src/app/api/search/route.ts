import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getQdrantClient } from "@/lib/vector/client";
import { createEmbedding } from "@/lib/openai/embeddings";

const searchSchema = z.object({
  q: z.string().min(1, "Query is required"),
  meetingId: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = searchSchema.safeParse({
    q: searchParams.get("q") ?? undefined,
    meetingId: searchParams.get("meetingId") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid search params", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { q, meetingId, limit } = parsed.data;

  let collectionsToSearch: { collectionName: string; meetingId: string }[];

  if (meetingId) {
    const [meeting] = await db
      .select()
      .from(meetings)
      .where(eq(meetings.id, meetingId));

    if (!meeting) {
      return NextResponse.json(
        { error: "Meeting not found" },
        { status: 404 }
      );
    }

    collectionsToSearch = [
      { collectionName: meeting.qdrantCollectionName, meetingId: meeting.id },
    ];
  } else {
    const searchable = await db
      .select()
      .from(meetings)
      .where(inArray(meetings.status, ["active", "completed"]));

    collectionsToSearch = searchable.map((m) => ({
      collectionName: m.qdrantCollectionName,
      meetingId: m.id,
    }));
  }

  let queryVector: number[];
  try {
    queryVector = await createEmbedding(q);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to create embedding",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }

  const client = getQdrantClient();

  const nested = await Promise.all(
    collectionsToSearch.map(async ({ collectionName, meetingId: mId }) => {
      try {
        const hits = await client.search(collectionName, {
          vector: queryVector,
          limit,
          with_payload: true,
        });

        return hits.map((hit) => {
          const payload = hit.payload as Record<string, unknown>;
          return {
            text: payload.text as string,
            speaker: payload.speaker as string,
            timestamp_ms: payload.timestamp_ms as number,
            score: hit.score,
            meetingId: mId,
          };
        });
      } catch {
        // Skip collections that don't exist or error
        return [];
      }
    })
  );

  const results = nested.flat().sort((a, b) => b.score - a.score).slice(0, limit);

  return NextResponse.json({ results });
}
