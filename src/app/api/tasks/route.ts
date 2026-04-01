import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { listTasks } from "@/lib/services/tasks";

export async function GET(request: Request) {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as "open" | "completed" | undefined;

  try {
    const result = await listTasks(user.id, {
      status: status === "open" || status === "completed" ? status : undefined,
      limit: 1000,
    });
    return NextResponse.json({ tasks: result.data });
  } catch (error) {
    console.error("Tasks list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
