import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { getDownloadUrl } from "@/lib/storage/operations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const { id } = await params;

  const [meeting] = await db
    .select({ metadata: meetings.metadata })
    .from(meetings)
    .where(and(eq(meetings.id, id), eq(meetings.userId, user.id)));

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const metadata = (meeting.metadata as Record<string, unknown>) ?? {};
  const recordingKey = metadata.recordingKey as string | undefined;

  if (!recordingKey) {
    return NextResponse.json(
      { error: "No recording available" },
      { status: 404 }
    );
  }

  const url = await getDownloadUrl(recordingKey, 3600); // 1 hour expiry
  return NextResponse.json({ url });
}
