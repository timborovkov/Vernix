import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { getMeetingBotProvider } from "@/lib/meeting-bot";
import { processMeetingEnd } from "@/lib/agent/processing";
import { requireLimits } from "@/lib/billing/enforce";
import { canStartMeeting } from "@/lib/billing/limits";
import {
  getActiveMeetingCount,
  getUsedMinutes,
  getMonthlyMeetingCount,
  getMonthlyVoiceMeetingCount,
} from "@/lib/billing/usage";
import { NotFoundError, BillingError, ConflictError } from "@/lib/api/errors";

// ---------------------------------------------------------------------------
// Join agent to meeting
// ---------------------------------------------------------------------------

export async function joinMeeting(
  userId: string,
  meetingId: string,
  userName?: string,
  opts?: { skipBillingCheck?: boolean }
) {
  const [meeting] = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId)));

  if (!meeting) throw new NotFoundError("Meeting");

  if (meeting.status !== "pending" && meeting.status !== "failed") {
    throw new ConflictError(
      `Cannot join meeting with status: ${meeting.status}`
    );
  }

  const silent = Boolean((meeting.metadata as Record<string, unknown>)?.silent);

  // Billing check (skip when called from autoJoin — createMeeting already checked)
  if (!opts?.skipBillingCheck) {
    const { limits, period } = await requireLimits(userId);
    const [activeMeetings, usedMinutes, monthlyCount, voiceCount] =
      await Promise.all([
        getActiveMeetingCount(userId),
        getUsedMinutes(userId, period.start, period.end),
        getMonthlyMeetingCount(userId),
        getMonthlyVoiceMeetingCount(userId),
      ]);
    const check = canStartMeeting(
      limits,
      !silent,
      usedMinutes,
      activeMeetings,
      monthlyCount,
      voiceCount
    );
    if (!check.allowed) {
      throw new BillingError(check.reason!, 429);
    }
  }

  // Optimistic lock: only transition if still in expected status
  const [transitioned] = await db
    .update(meetings)
    .set({ status: "joining", updatedAt: new Date() })
    .where(
      and(
        eq(meetings.id, meetingId),
        eq(meetings.userId, userId),
        sql`${meetings.status} IN ('pending', 'failed')`
      )
    )
    .returning({ id: meetings.id });

  if (!transitioned) {
    throw new ConflictError(
      "Meeting is already being joined by another request"
    );
  }

  const provider = getMeetingBotProvider();
  const existingMetadata = (meeting.metadata as Record<string, unknown>) ?? {};

  try {
    const { botId, voiceSecret } = await provider.joinMeeting(
      meeting.joinLink,
      meetingId,
      userName,
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
      .where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId)));

    return { botId, status: "active" as const };
  } catch (error) {
    console.error("Failed to join meeting:", error);

    await db
      .update(meetings)
      .set({ status: "failed", updatedAt: new Date() })
      .where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId)));

    throw error;
  }
}

// ---------------------------------------------------------------------------
// Stop agent and trigger processing
// ---------------------------------------------------------------------------

export async function stopMeeting(userId: string, meetingId: string) {
  const [meeting] = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId)));

  if (!meeting) throw new NotFoundError("Meeting");

  const stoppable = ["active", "joining", "processing"];
  if (!stoppable.includes(meeting.status)) {
    throw new ConflictError(
      `Cannot stop meeting with status: ${meeting.status}`
    );
  }

  // Only call leaveMeeting for active/joining
  if (meeting.status !== "processing") {
    const provider = getMeetingBotProvider();
    const botId = (meeting.metadata as Record<string, unknown>)?.botId as
      | string
      | undefined;

    if (botId) {
      try {
        await provider.leaveMeeting(botId);
      } catch (error) {
        console.warn("leaveMeeting failed (bot may have already left):", error);
      }
    }
  }

  await db
    .update(meetings)
    .set({
      status: "processing",
      endedAt: meeting.endedAt ?? new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId)));

  const existingMetadata = (meeting.metadata as Record<string, unknown>) ?? {};
  await processMeetingEnd(meetingId, userId, meeting.qdrantCollectionName, {
    ...existingMetadata,
    title: meeting.title,
    startedAt: meeting.startedAt,
    endedAt: meeting.endedAt ?? new Date(),
    participants: (meeting.participants as string[]) ?? [],
  });

  // Re-fetch to return the actual post-processing status (completed or failed)
  let finalStatus = "processing";
  try {
    const rows = await db
      .select({ status: meetings.status })
      .from(meetings)
      .where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId)));
    if (Array.isArray(rows) && rows[0]?.status) {
      finalStatus = rows[0].status;
    }
  } catch {
    // If re-fetch fails, return processing — the caller can poll for updates
  }

  return { status: finalStatus };
}
