import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { requireSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { meetings, tasks } from "@/lib/db/schema";

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  assignee: z.string().max(200).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const { id } = await params;

  // Verify meeting ownership
  const [meeting] = await db
    .select({ id: meetings.id })
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

  return NextResponse.json({ tasks: meetingTasks });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const { id } = await params;

  // Verify meeting ownership
  const [meeting] = await db
    .select({ id: meetings.id })
    .from(meetings)
    .where(and(eq(meetings.id, id), eq(meetings.userId, user.id)));

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = createTaskSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const [task] = await db
    .insert(tasks)
    .values({
      meetingId: id,
      userId: user.id,
      title: parsed.data.title,
      assignee: parsed.data.assignee ?? null,
    })
    .returning();

  return NextResponse.json(task, { status: 201 });
}
