import { db } from "@/lib/db";
import { meetings, tasks } from "@/lib/db/schema";
import { and, desc, eq, lt, or } from "drizzle-orm";
import { NotFoundError, ValidationError } from "@/lib/api/errors";
import { decodeCursor, buildPaginationMeta } from "@/lib/api/pagination";

// ---------------------------------------------------------------------------
// List tasks (cross-meeting, paginated)
// ---------------------------------------------------------------------------

export async function listTasks(
  userId: string,
  opts: {
    meetingId?: string;
    status?: "open" | "completed";
    cursor?: string;
    limit?: number;
  }
) {
  const limit = opts.limit ?? 20;
  const conditions = [eq(tasks.userId, userId)];

  if (opts.meetingId) conditions.push(eq(tasks.meetingId, opts.meetingId));
  if (opts.status) conditions.push(eq(tasks.status, opts.status));

  if (opts.cursor) {
    const cursor = decodeCursor(opts.cursor);
    if (cursor) {
      conditions.push(
        or(
          lt(tasks.createdAt, new Date(cursor.createdAt)),
          and(
            eq(tasks.createdAt, new Date(cursor.createdAt)),
            lt(tasks.id, cursor.id)
          )
        )!
      );
    }
  }

  const rows = await db
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
    .orderBy(desc(tasks.createdAt), desc(tasks.id))
    .limit(limit + 1);

  return buildPaginationMeta(rows, limit);
}

// ---------------------------------------------------------------------------
// Get task
// ---------------------------------------------------------------------------

export async function getTask(userId: string, taskId: string) {
  const [task] = await db
    .select({
      id: tasks.id,
      meetingId: tasks.meetingId,
      title: tasks.title,
      assignee: tasks.assignee,
      status: tasks.status,
      sourceText: tasks.sourceText,
      sourceTimestampMs: tasks.sourceTimestampMs,
      dueDate: tasks.dueDate,
      autoExtracted: tasks.autoExtracted,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      meetingTitle: meetings.title,
    })
    .from(tasks)
    .leftJoin(meetings, eq(tasks.meetingId, meetings.id))
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));

  if (!task) throw new NotFoundError("Task");
  return task;
}

// ---------------------------------------------------------------------------
// Create task
// ---------------------------------------------------------------------------

export async function createTask(
  userId: string,
  meetingId: string,
  input: { title: string; assignee?: string }
) {
  // Verify meeting ownership
  const [meeting] = await db
    .select({ id: meetings.id })
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId)));

  if (!meeting) throw new NotFoundError("Meeting");

  const [task] = await db
    .insert(tasks)
    .values({
      meetingId,
      userId,
      title: input.title,
      assignee: input.assignee ?? null,
    })
    .returning();

  return task!;
}

// ---------------------------------------------------------------------------
// Update task
// ---------------------------------------------------------------------------

export async function updateTask(
  userId: string,
  taskId: string,
  input: {
    title?: string;
    assignee?: string | null;
    status?: "open" | "completed";
    dueDate?: string | null;
    meetingId?: string;
  }
) {
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (
    typeof input.title === "string" &&
    input.title.length > 0 &&
    input.title.length <= 500
  ) {
    updates.title = input.title;
  }
  if (input.assignee !== undefined) {
    updates.assignee = input.assignee || null;
  }
  if (input.status === "open" || input.status === "completed") {
    updates.status = input.status;
  }
  if (input.dueDate === null) {
    updates.dueDate = null;
  } else if (typeof input.dueDate === "string") {
    const parsed = new Date(input.dueDate);
    if (isNaN(parsed.getTime())) {
      throw new ValidationError("Invalid due date");
    }
    updates.dueDate = parsed;
  }

  const conditions = [eq(tasks.id, taskId), eq(tasks.userId, userId)];
  if (input.meetingId) conditions.push(eq(tasks.meetingId, input.meetingId));

  const [updated] = await db
    .update(tasks)
    .set(updates)
    .where(and(...conditions))
    .returning();

  if (!updated) throw new NotFoundError("Task");
  return updated;
}
