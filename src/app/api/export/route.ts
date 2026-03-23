import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { meetings, tasks } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { scrollTranscript } from "@/lib/vector/scroll";
import { requireSessionUser } from "@/lib/auth/session";
import { generateMeetingsZip } from "@/lib/export/zip";
import type { MeetingExportData } from "@/lib/export/markdown";

const MAX_MEETINGS = 100;
const CONCURRENCY = 5;

export async function GET() {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const allMeetings = await db
    .select()
    .from(meetings)
    .where(eq(meetings.userId, user.id))
    .orderBy(desc(meetings.createdAt))
    .limit(MAX_MEETINGS);

  // Fetch tasks and transcripts with concurrency limit
  const exportData: MeetingExportData[] = [];

  for (let i = 0; i < allMeetings.length; i += CONCURRENCY) {
    const batch = allMeetings.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (meeting) => {
        const meetingTasks = await db
          .select()
          .from(tasks)
          .where(
            and(eq(tasks.meetingId, meeting.id), eq(tasks.userId, user.id))
          )
          .orderBy(desc(tasks.createdAt));

        let transcript: Awaited<ReturnType<typeof scrollTranscript>> = [];
        try {
          transcript = await scrollTranscript(meeting.qdrantCollectionName);
        } catch {
          // Transcript unavailable
        }

        return { meeting, tasks: meetingTasks, transcript };
      })
    );
    exportData.push(...results);
  }

  const buffer = await generateMeetingsZip(exportData);
  const date = new Date().toISOString().split("T")[0];

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="kivikova-export-${date}.zip"`,
    },
  });
}
