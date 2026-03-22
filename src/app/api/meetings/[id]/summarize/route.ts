import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { scrollTranscript } from "@/lib/vector/scroll";
import { generateMeetingSummary } from "@/lib/summary/generate";
import { requireSessionUser } from "@/lib/auth/session";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const [meeting] = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.id, id), eq(meetings.userId, user.id)));

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  if (meeting.status !== "completed" && meeting.status !== "processing") {
    return NextResponse.json(
      {
        error: `Cannot summarize meeting with status: ${meeting.status}`,
      },
      { status: 400 }
    );
  }

  try {
    const segments = await scrollTranscript(meeting.qdrantCollectionName);
    const summary = await generateMeetingSummary(segments);
    const existingMetadata =
      (meeting.metadata as Record<string, unknown>) ?? {};

    const [updated] = await db
      .update(meetings)
      .set({
        metadata: { ...existingMetadata, summary },
        updatedAt: new Date(),
      })
      .where(and(eq(meetings.id, id), eq(meetings.userId, user.id)))
      .returning();

    return NextResponse.json({ success: true, summary: updated.metadata });
  } catch (error) {
    console.error("Summary generation failed:", error);
    return NextResponse.json(
      {
        error: "Failed to generate summary",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
