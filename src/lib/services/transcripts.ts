import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { scrollTranscript } from "@/lib/vector/scroll";
import { NotFoundError } from "@/lib/api/errors";

// ---------------------------------------------------------------------------
// Get transcript for a meeting
// ---------------------------------------------------------------------------

export async function getTranscript(userId: string, meetingId: string) {
  const [meeting] = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId)));

  if (!meeting) throw new NotFoundError("Meeting");

  const segments = await scrollTranscript(meeting.qdrantCollectionName);
  return { segments };
}
