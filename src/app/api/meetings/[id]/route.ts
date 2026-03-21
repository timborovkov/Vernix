import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { deleteMeetingCollection } from "@/lib/vector/collections";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [meeting] = await db.select().from(meetings).where(eq(meetings.id, id));

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  return NextResponse.json(meeting);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const [updated] = await db
    .update(meetings)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(meetings.id, id))
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
  const { id } = await params;
  const [meeting] = await db.select().from(meetings).where(eq(meetings.id, id));

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  await deleteMeetingCollection(meeting.qdrantCollectionName);
  await db.delete(meetings).where(eq(meetings.id, id));

  return NextResponse.json({ success: true });
}
