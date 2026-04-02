import { db } from "@/lib/db";
import { meetings, users, documents } from "@/lib/db/schema";
import { and, desc, eq, lt, or } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  createMeetingCollection,
  deleteMeetingCollection,
} from "@/lib/vector/collections";
import { upsertAgenda } from "@/lib/vector/agenda";
import { deleteFile } from "@/lib/storage/operations";
import { getMeetingBotProvider } from "@/lib/meeting-bot";
import { requireLimits } from "@/lib/billing/enforce";
import { canStartMeeting } from "@/lib/billing/limits";
import {
  getActiveMeetingCount,
  getUsedMinutes,
  getMonthlyMeetingCount,
  getMonthlyVoiceMeetingCount,
} from "@/lib/billing/usage";
import { NotFoundError, BillingError, ValidationError } from "@/lib/api/errors";
import { decodeCursor, buildPaginationMeta } from "@/lib/api/pagination";

// ---------------------------------------------------------------------------
// List meetings (paginated)
// ---------------------------------------------------------------------------

export async function listMeetings(
  userId: string,
  opts: {
    status?: string;
    cursor?: string;
    limit?: number;
  }
) {
  const limit = opts.limit ?? 20;
  const conditions = [eq(meetings.userId, userId)];

  if (opts.status) {
    conditions.push(
      eq(
        meetings.status,
        opts.status as (typeof meetings.status.enumValues)[number]
      )
    );
  }

  if (opts.cursor) {
    const cursor = decodeCursor(opts.cursor);
    if (cursor) {
      conditions.push(
        or(
          lt(meetings.createdAt, new Date(cursor.createdAt)),
          and(
            eq(meetings.createdAt, new Date(cursor.createdAt)),
            lt(meetings.id, cursor.id)
          )
        )!
      );
    }
  }

  const rows = await db
    .select()
    .from(meetings)
    .where(and(...conditions))
    .orderBy(desc(meetings.createdAt), desc(meetings.id))
    .limit(limit + 1);

  return buildPaginationMeta(rows, limit);
}

// ---------------------------------------------------------------------------
// Create meeting
// ---------------------------------------------------------------------------

export async function createMeeting(
  userId: string,
  input: {
    title: string;
    joinLink: string;
    agenda?: string;
    silent?: boolean;
    noRecording?: boolean;
  }
) {
  // Billing check
  const silent = input.silent ?? false;
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

  const collectionName = `meeting_${randomUUID().replace(/-/g, "")}`;
  await createMeetingCollection(collectionName);

  const metadata: Record<string, unknown> = {};
  if (input.agenda?.trim()) metadata.agenda = input.agenda.trim();
  if (silent) metadata.silent = true;
  if (input.noRecording) metadata.noRecording = true;

  const [meeting] = await db
    .insert(meetings)
    .values({
      title: input.title,
      joinLink: input.joinLink,
      userId,
      qdrantCollectionName: collectionName,
      metadata,
    })
    .returning();

  // Track last activity (fire-and-forget)
  Promise.resolve(
    db
      .update(users)
      .set({ lastActiveAt: new Date() })
      .where(eq(users.id, userId))
  ).catch(() => {});

  // Embed agenda if provided
  if (metadata.agenda) {
    try {
      await upsertAgenda(collectionName, metadata.agenda as string);
    } catch (error) {
      console.error("Agenda embedding failed:", error);
    }
  }

  return meeting!;
}

// ---------------------------------------------------------------------------
// Get meeting
// ---------------------------------------------------------------------------

export async function getMeeting(userId: string, meetingId: string) {
  const [meeting] = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId)));

  if (!meeting) throw new NotFoundError("Meeting");
  return meeting;
}

// ---------------------------------------------------------------------------
// Update meeting
// ---------------------------------------------------------------------------

export async function updateMeeting(
  userId: string,
  meetingId: string,
  input: {
    title?: string;
    joinLink?: string;
    agenda?: string;
    silent?: boolean;
    muted?: boolean;
    noRecording?: boolean;
  }
) {
  const meeting = await getMeeting(userId, meetingId);

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof input.title === "string") updates.title = input.title;
  if (typeof input.joinLink === "string") updates.joinLink = input.joinLink;

  const existingMetadata = (meeting.metadata as Record<string, unknown>) ?? {};
  let metadataChanged = false;
  const metadataUpdates: Record<string, unknown> = { ...existingMetadata };

  if (typeof input.agenda === "string") {
    if (input.agenda.length > 10000) {
      throw new ValidationError("Agenda must be under 10,000 characters");
    }
    const trimmedAgenda = input.agenda.trim();
    metadataUpdates.agenda = trimmedAgenda || null;
    metadataChanged = true;

    try {
      await upsertAgenda(meeting.qdrantCollectionName, trimmedAgenda);
    } catch (error) {
      console.error("Agenda embedding failed:", error);
    }
  }

  if (typeof input.silent === "boolean") {
    if (["pending", "failed"].includes(meeting.status)) {
      metadataUpdates.silent = input.silent;
      metadataChanged = true;
    }
  }

  if (typeof input.noRecording === "boolean") {
    if (["pending", "failed"].includes(meeting.status)) {
      metadataUpdates.noRecording = input.noRecording;
      metadataChanged = true;
    }
  }

  if (typeof input.muted === "boolean" && meeting.status === "active") {
    metadataUpdates.muted = input.muted;
    metadataChanged = true;
  }

  if (metadataChanged) updates.metadata = metadataUpdates;

  const [updated] = await db
    .update(meetings)
    .set(updates)
    .where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId)))
    .returning();

  if (!updated) throw new NotFoundError("Meeting");
  return updated;
}

// ---------------------------------------------------------------------------
// Delete meeting
// ---------------------------------------------------------------------------

export async function deleteMeeting(userId: string, meetingId: string) {
  const meeting = await getMeeting(userId, meetingId);

  // Clean up S3 recording
  const metadata = (meeting.metadata as Record<string, unknown>) ?? {};
  const recordingKey = metadata.recordingKey as string | undefined;
  if (recordingKey) {
    try {
      await deleteFile(recordingKey);
    } catch {
      // best-effort
    }
  }

  // Clean up Recall bot
  const botId = metadata.botId as string | undefined;
  if (botId) {
    try {
      const provider = getMeetingBotProvider();
      if (provider.deleteBot) await provider.deleteBot(botId);
    } catch {
      // best-effort
    }
  }

  await deleteMeetingCollection(meeting.qdrantCollectionName);

  // Clean up meeting-scoped documents (scoped to userId for defense-in-depth)
  const meetingDocs = await db
    .select({ id: documents.id, s3Key: documents.s3Key })
    .from(documents)
    .where(
      and(eq(documents.meetingId, meetingId), eq(documents.userId, userId))
    );

  for (const doc of meetingDocs) {
    try {
      await deleteFile(doc.s3Key);
    } catch {
      // best-effort
    }
  }

  if (meetingDocs.length > 0) {
    await db
      .delete(documents)
      .where(
        and(eq(documents.meetingId, meetingId), eq(documents.userId, userId))
      );
  }

  await db
    .delete(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId)));
}
