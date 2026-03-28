import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getMeetingBotProvider } from "@/lib/meeting-bot";
import { requireSessionUser } from "@/lib/auth/session";
import { requireLimits, billingError } from "@/lib/billing/enforce";
import { canStartMeeting } from "@/lib/billing/limits";
import {
  getActiveMeetingCount,
  getUsedMinutes,
  getMonthlyMeetingCount,
} from "@/lib/billing/usage";
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

  const { meetingId } = parsed.data;

  const [meeting] = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.userId, user.id)));

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  if (meeting.status !== "pending" && meeting.status !== "failed") {
    return NextResponse.json(
      { error: `Cannot join meeting with status: ${meeting.status}` },
      { status: 400 }
    );
  }

  // Billing check
  const silent = Boolean((meeting.metadata as Record<string, unknown>)?.silent);
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

  await db
    .update(meetings)
    .set({ status: "joining", updatedAt: new Date() })
    .where(and(eq(meetings.id, meetingId), eq(meetings.userId, user.id)));

  const provider = getMeetingBotProvider();
  const existingMetadata = (meeting.metadata as Record<string, unknown>) ?? {};

  try {
    const { botId, voiceSecret } = await provider.joinMeeting(
      meeting.joinLink,
      meetingId,
      user.name,
      { silent }
    );

    await db
      .update(meetings)
      .set({
        status: "active",
        startedAt: new Date(),
        metadata: {
          ...existingMetadata,
          botId,
          silent,
          ...(voiceSecret !== undefined ? { voiceSecret } : {}),
        },
        updatedAt: new Date(),
      })
      .where(and(eq(meetings.id, meetingId), eq(meetings.userId, user.id)));

    return NextResponse.json({ success: true, botId });
  } catch (error) {
    console.error("Failed to join meeting:", error);

    await db
      .update(meetings)
      .set({ status: "failed", updatedAt: new Date() })
      .where(and(eq(meetings.id, meetingId), eq(meetings.userId, user.id)));

    return NextResponse.json(
      {
        error: "Failed to join meeting",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
