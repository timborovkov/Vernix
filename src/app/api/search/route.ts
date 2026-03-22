import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { z } from "zod/v4";
import {
  getRAGContext,
  MeetingNotFoundError,
  EmbeddingError,
  AllSearchesFailedError,
} from "@/lib/agent/rag";

const searchSchema = z.object({
  q: z.string().min(1, "Query is required"),
  meetingId: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export async function GET(request: Request) {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

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

  try {
    const ragResults = await getRAGContext(q, {
      meetingId,
      limit,
      userId: user.id,
    });

    const results = ragResults.map((r) => ({
      text: r.text,
      speaker: r.speaker,
      timestamp_ms: r.timestampMs,
      score: r.score,
      meetingId: r.meetingId,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof MeetingNotFoundError) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }
    if (error instanceof EmbeddingError) {
      return NextResponse.json(
        {
          error: "Failed to create embedding",
          details: error.message,
        },
        { status: 500 }
      );
    }
    if (error instanceof AllSearchesFailedError) {
      return NextResponse.json(
        { error: "Vector search failed for all collections" },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
