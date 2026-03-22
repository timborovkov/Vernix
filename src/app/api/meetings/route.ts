import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { createMeetingCollection } from "@/lib/vector/collections";
import { desc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { randomUUID } from "crypto";
import { requireSessionUser } from "@/lib/auth/session";

const createMeetingSchema = z.object({
  title: z.string().min(1, "Title is required"),
  joinLink: z.url("Must be a valid URL"),
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

  const { title, joinLink } = parsed.data;
  const collectionName = `meeting_${randomUUID().replace(/-/g, "")}`;

  await createMeetingCollection(collectionName);

  const [meeting] = await db
    .insert(meetings)
    .values({
      title,
      joinLink,
      userId: user.id,
      qdrantCollectionName: collectionName,
    })
    .returning();

  return NextResponse.json(meeting, { status: 201 });
}
