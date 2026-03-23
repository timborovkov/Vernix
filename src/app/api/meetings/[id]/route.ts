import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { deleteMeetingCollection } from "@/lib/vector/collections";
import { upsertAgenda } from "@/lib/vector/agenda";
import { requireSessionUser } from "@/lib/auth/session";
import { documents } from "@/lib/db/schema";
import { deleteFile } from "@/lib/storage/operations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const [meeting] = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.id, id), eq(meetings.userId, user.id)));

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  return NextResponse.json(meeting);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const body = await request.json();

  // Fetch meeting first to get existing metadata and collection name
  const [meeting] = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.id, id), eq(meetings.userId, user.id)));

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  // Only allow updating safe fields
  const { title, joinLink, agenda } = body as Record<string, unknown>;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof title === "string") updates.title = title;
  if (typeof joinLink === "string") updates.joinLink = joinLink;

  // Handle agenda update
  if (typeof agenda === "string" && agenda.length <= 10000) {
    const trimmedAgenda = agenda.trim();
    const existingMetadata =
      (meeting.metadata as Record<string, unknown>) ?? {};
    updates.metadata = {
      ...existingMetadata,
      agenda: trimmedAgenda || null,
    };

    // Re-embed agenda into Qdrant
    try {
      await upsertAgenda(meeting.qdrantCollectionName, trimmedAgenda);
    } catch (error) {
      console.error("Agenda embedding failed:", error);
    }
  }

  const [updated] = await db
    .update(meetings)
    .set(updates)
    .where(and(eq(meetings.id, id), eq(meetings.userId, user.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const [meeting] = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.id, id), eq(meetings.userId, user.id)));

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  await deleteMeetingCollection(meeting.qdrantCollectionName);

  // Clean up meeting-scoped documents (S3 files + DB rows)
  const meetingDocs = await db
    .select({ id: documents.id, s3Key: documents.s3Key })
    .from(documents)
    .where(eq(documents.meetingId, id));

  for (const doc of meetingDocs) {
    try {
      await deleteFile(doc.s3Key);
    } catch {
      // S3 cleanup is best-effort
    }
  }

  if (meetingDocs.length > 0) {
    await db.delete(documents).where(eq(documents.meetingId, id));
  }

  await db
    .delete(meetings)
    .where(and(eq(meetings.id, id), eq(meetings.userId, user.id)));

  return NextResponse.json({ success: true });
}
