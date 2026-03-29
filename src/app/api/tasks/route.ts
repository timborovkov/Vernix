import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { requireSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { meetings, tasks } from "@/lib/db/schema";

export async function GET(request: Request) {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const conditions = [eq(tasks.userId, user.id)];
  if (status === "open" || status === "completed") {
    conditions.push(eq(tasks.status, status));
  }

  const results = await db
    .select({
      id: tasks.id,
      meetingId: tasks.meetingId,
      title: tasks.title,
      assignee: tasks.assignee,
      status: tasks.status,
      sourceText: tasks.sourceText,
      sourceTimestampMs: tasks.sourceTimestampMs,
      dueDate: tasks.dueDate,
      createdAt: tasks.createdAt,
      meetingTitle: meetings.title,
    })
    .from(tasks)
    .leftJoin(meetings, eq(tasks.meetingId, meetings.id))
    .where(and(...conditions))
    .orderBy(desc(tasks.createdAt));

  return NextResponse.json({ tasks: results });
}
