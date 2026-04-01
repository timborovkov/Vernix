import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { joinMeeting } from "@/lib/services/agent";
import { NotFoundError, BillingError, ConflictError } from "@/lib/api/errors";
import { z } from "zod/v4";

const joinSchema = z.object({
  meetingId: z.uuid(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = joinSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid meeting ID", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  try {
    const result = await joinMeeting(user.id, parsed.data.meetingId, user.name);
    return NextResponse.json({ success: true, botId: result.botId });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }
    if (error instanceof ConflictError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof BillingError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.statusCode === 429 ? "RATE_LIMITED" : "BILLING_LIMIT",
        },
        { status: error.statusCode }
      );
    }
    console.error("Failed to join meeting:", error);
    return NextResponse.json(
      {
        error: "Failed to join meeting",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
