import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { updateTask } from "@/lib/services/tasks";
import { NotFoundError, ValidationError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const { id: meetingId, taskId } = await params;
  const body = await request.json();

  const { title, assignee, status, dueDate } = body as Record<string, unknown>;

  try {
    const updated = await updateTask(user.id, taskId, {
      meetingId,
      title: typeof title === "string" ? title : undefined,
      assignee:
        assignee === null
          ? null
          : typeof assignee === "string"
            ? assignee
            : undefined,
      status: status === "open" || status === "completed" ? status : undefined,
      dueDate:
        dueDate === null
          ? null
          : typeof dueDate === "string"
            ? dueDate
            : undefined,
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
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
