import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const { id: meetingId, taskId } = await params;
  const body = await request.json();

  // Allowlisted fields only
  const { title, assignee, status, dueDate } = body as Record<string, unknown>;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof title === "string" && title.length > 0 && title.length <= 500)
    updates.title = title;
  if (typeof assignee === "string" && assignee.length <= 200)
    updates.assignee = assignee || null;
  if (status === "open" || status === "completed") updates.status = status;
  if (typeof dueDate === "string") {
    const parsed = new Date(dueDate);
    if (isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "Invalid due date" }, { status: 400 });
    }
    updates.dueDate = parsed;
  }
  if (dueDate === null) updates.dueDate = null;

  const [updated] = await db
    .update(tasks)
    .set(updates)
    .where(
      and(
        eq(tasks.id, taskId),
        eq(tasks.meetingId, meetingId),
        eq(tasks.userId, user.id)
      )
    )
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const { id: meetingId, taskId } = await params;

  const [deleted] = await db
    .delete(tasks)
    .where(
      and(
        eq(tasks.id, taskId),
        eq(tasks.meetingId, meetingId),
        eq(tasks.userId, user.id)
      )
    )
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
