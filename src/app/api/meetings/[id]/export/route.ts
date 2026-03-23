import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { meetings, tasks } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { scrollTranscript } from "@/lib/vector/scroll";
import { requireSessionUser } from "@/lib/auth/session";
import { formatMeetingMarkdown, slugify } from "@/lib/export/markdown";
import { generateMeetingPdf } from "@/lib/export/pdf";

const formatSchema = z.enum(["md", "pdf"]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const url = new URL(request.url);
  const formatResult = formatSchema.safeParse(url.searchParams.get("format"));
  if (!formatResult.success) {
    return NextResponse.json(
      { error: "Invalid format. Use ?format=md or ?format=pdf" },
      { status: 400 }
    );
  }
  const format = formatResult.data;

  const { id } = await params;
  const [meeting] = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.id, id), eq(meetings.userId, user.id)));

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const meetingTasks = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.meetingId, id), eq(tasks.userId, user.id)))
    .orderBy(desc(tasks.createdAt));

  let transcript: Awaited<ReturnType<typeof scrollTranscript>> = [];
  try {
    transcript = await scrollTranscript(meeting.qdrantCollectionName);
  } catch {
    // Transcript unavailable — export without it
  }

  const exportData = { meeting, tasks: meetingTasks, transcript };
  const slug = slugify(meeting.title) || "meeting";

  if (format === "md") {
    const content = formatMeetingMarkdown(exportData);
    return new Response(content, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slug}.md"`,
      },
    });
  }

  const buffer = await generateMeetingPdf(exportData);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slug}.pdf"`,
    },
  });
}
