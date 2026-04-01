import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireSessionUser } from "@/lib/auth/session";
import { listTasks, createTask } from "@/lib/services/tasks";
import { NotFoundError } from "@/lib/api/errors";

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

  try {
    const result = await listTasks(user.id, { meetingId: id, limit: 1000 });
    return NextResponse.json({ tasks: result.data });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const { id } = await params;

  const body = await request.json();
  const parsed = createTaskSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const task = await createTask(user.id, id, parsed.data);
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
