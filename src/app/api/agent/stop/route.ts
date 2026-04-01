import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { stopMeeting } from "@/lib/services/agent";
import { NotFoundError, ConflictError } from "@/lib/api/errors";
import { z } from "zod/v4";

const stopSchema = z.object({
  meetingId: z.uuid(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = stopSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid meeting ID", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  try {
    await stopMeeting(user.id, parsed.data.meetingId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }
    if (error instanceof ConflictError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Failed to stop meeting:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
