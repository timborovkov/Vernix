import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { searchMeetings } from "@/lib/services/search";
import { NotFoundError, BillingError, SearchError } from "@/lib/api/errors";
import { z } from "zod/v4";

const searchSchema = z.object({
  q: z.string().min(1, "Query is required"),
  meetingId: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export async function GET(request: Request) {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(request.url);
  const parsed = searchSchema.safeParse({
    q: searchParams.get("q") ?? undefined,
    meetingId: searchParams.get("meetingId") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid search params", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const results = await searchMeetings(user.id, {
      query: parsed.data.q,
      meetingId: parsed.data.meetingId,
      limit: parsed.data.limit,
    });
    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
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
    if (error instanceof SearchError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
