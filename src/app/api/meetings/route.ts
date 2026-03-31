import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { createMeetingCollection } from "@/lib/vector/collections";
import { upsertAgenda } from "@/lib/vector/agenda";
import { desc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { randomUUID } from "crypto";
import { requireSessionUser } from "@/lib/auth/session";
import { requireLimits, billingError } from "@/lib/billing/enforce";
import { canStartMeeting } from "@/lib/billing/limits";
import {
  getActiveMeetingCount,
  getUsedMinutes,
  getMonthlyMeetingCount,
} from "@/lib/billing/usage";

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

  const { title, joinLink, agenda, silent, noRecording } = parsed.data;

  // Billing check
  const { limits, period } = await requireLimits(user.id);
  const [activeMeetings, usedMinutes, monthlyCount] = await Promise.all([
    getActiveMeetingCount(user.id),
    getUsedMinutes(user.id, period.start, period.end),
    getMonthlyMeetingCount(user.id),
  ]);
  const check = canStartMeeting(
    limits,
    !silent,
    usedMinutes,
    activeMeetings,
    monthlyCount
  );
  if (!check.allowed)
    return billingError(check, !silent && !limits.voiceEnabled ? 403 : 429);

  const collectionName = `meeting_${randomUUID().replace(/-/g, "")}`;

  await createMeetingCollection(collectionName);

  const metadata: Record<string, unknown> = {};
  if (agenda?.trim()) {
    metadata.agenda = agenda.trim();
  }
  if (silent) {
    metadata.silent = true;
  }
  if (noRecording) {
    metadata.noRecording = true;
  }

  const [meeting] = await db
    .insert(meetings)
    .values({
      title,
      joinLink,
      userId: user.id,
      qdrantCollectionName: collectionName,
      metadata,
    })
    .returning();

  // Embed agenda into Qdrant if provided
  if (metadata.agenda) {
    try {
      await upsertAgenda(collectionName, metadata.agenda as string);
    } catch (error) {
      console.error("Agenda embedding failed:", error);
    }
  }

  return NextResponse.json(meeting, { status: 201 });
}
