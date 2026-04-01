import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { requireSessionUser } from "@/lib/auth/session";
import { createMeeting } from "@/lib/services/meetings";
import { BillingError, ValidationError } from "@/lib/api/errors";

const createMeetingSchema = z.object({
  title: z.string().min(1, "Title is required"),
  joinLink: z.url("Must be a valid URL"),
  agenda: z.string().max(10000).optional(),
  silent: z.boolean().optional().default(false),
  noRecording: z.boolean().optional().default(false),
});

export async function GET() {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const allMeetings = await db
    .select()
    .from(meetings)
    .where(eq(meetings.userId, user.id))
    .orderBy(desc(meetings.createdAt));

  return NextResponse.json(allMeetings);
}

export async function POST(request: Request) {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const body = await request.json();
  const parsed = createMeetingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const meeting = await createMeeting(user.id, parsed.data);
    return NextResponse.json(meeting, { status: 201 });
  } catch (error) {
    if (error instanceof BillingError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.statusCode === 429 ? "RATE_LIMITED" : "BILLING_LIMIT",
        },
        { status: error.statusCode }
      );
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Failed to create meeting:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
