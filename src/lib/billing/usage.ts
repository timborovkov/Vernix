import { db } from "@/lib/db";
import {
  usageEvents,
  users,
  meetings,
  documents,
  mcpServers,
} from "@/lib/db/schema";
import { and, eq, gte, sql, lte } from "drizzle-orm";
import { USAGE_RATES, MONTHLY_CREDIT, type Plan } from "./constants";

// ---------------------------------------------------------------------------
// Record usage events
// ---------------------------------------------------------------------------

export async function recordMeetingUsage(
  userId: string,
  meetingId: string,
  type: "voice_meeting" | "silent_meeting",
  durationMinutes: number
) {
  // Idempotency: skip if usage was already recorded for this meeting
  const [existing] = await db
    .select({ id: usageEvents.id })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.userId, userId),
        eq(usageEvents.meetingId, meetingId),
        eq(usageEvents.type, type)
      )
    );
  if (existing) return;

  const hours = durationMinutes / 60;
  const rate =
    type === "voice_meeting" ? USAGE_RATES.voice : USAGE_RATES.silent;
  const costEur = hours * rate;

  await db.insert(usageEvents).values({
    userId,
    meetingId,
    type,
    quantity: String(durationMinutes),
    costEur: String(costEur),
  });
}

export async function recordUsageEvent(
  userId: string,
  type: "rag_query" | "api_request" | "doc_upload",
  metadata?: Record<string, unknown>
) {
  await db.insert(usageEvents).values({
    userId,
    type,
    quantity: "1",
    costEur: "0",
    metadata: metadata ?? {},
  });
}

// ---------------------------------------------------------------------------
// Query usage for a billing period
// ---------------------------------------------------------------------------

export interface UsageSummary {
  voiceMinutes: number;
  silentMinutes: number;
  voiceMeetingsUsed: number;
  totalCostEur: number;
  creditEur: number;
  overageEur: number;
  ragQueries: number;
  apiRequests: number;
  docUploads: number;
}

export async function getUsageSummary(
  userId: string,
  plan: Plan,
  periodStart: Date,
  periodEnd: Date
): Promise<UsageSummary> {
  const rows = await db
    .select({
      type: usageEvents.type,
      totalQuantity: sql<string>`coalesce(sum(${usageEvents.quantity}), '0')`,
      totalCost: sql<string>`coalesce(sum(${usageEvents.costEur}), '0')`,
    })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.userId, userId),
        gte(usageEvents.createdAt, periodStart),
        lte(usageEvents.createdAt, periodEnd)
      )
    )
    .groupBy(usageEvents.type);

  const byType = Object.fromEntries(
    rows.map((r) => [
      r.type,
      { qty: Number(r.totalQuantity), cost: Number(r.totalCost) },
    ])
  );

  const voiceMinutes = byType["voice_meeting"]?.qty ?? 0;
  const silentMinutes = byType["silent_meeting"]?.qty ?? 0;
  const totalCostEur =
    (byType["voice_meeting"]?.cost ?? 0) +
    (byType["silent_meeting"]?.cost ?? 0);
  const creditEur = MONTHLY_CREDIT[plan] ?? 0;
  const overageEur = Math.max(0, totalCostEur - creditEur);

  return {
    voiceMinutes,
    silentMinutes,
    voiceMeetingsUsed: 0, // populated by billing API from getMonthlyVoiceMeetingCount
    totalCostEur,
    creditEur,
    overageEur,
    ragQueries: byType["rag_query"]?.qty ?? 0,
    apiRequests: byType["api_request"]?.qty ?? 0,
    docUploads: byType["doc_upload"]?.qty ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Count usage for daily limits (rag queries, api requests)
// ---------------------------------------------------------------------------

export async function getDailyCount(
  userId: string,
  type: "rag_query" | "api_request"
): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const [row] = await db
    .select({
      count: sql<string>`coalesce(sum(${usageEvents.quantity}), '0')`,
    })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.userId, userId),
        eq(usageEvents.type, type),
        gte(usageEvents.createdAt, startOfDay)
      )
    );

  return Number(row?.count ?? 0);
}

// ---------------------------------------------------------------------------
// Monthly meeting count (anti-abuse)
// ---------------------------------------------------------------------------

export async function getMonthlyMeetingCount(userId: string): Promise<number> {
  // Count from the meetings table (not usageEvents) so in-progress meetings
  // that haven't ended yet are included in the anti-abuse cap.
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const [row] = await db
    .select({
      count: sql<string>`count(*)`,
    })
    .from(meetings)
    .where(
      and(eq(meetings.userId, userId), gte(meetings.createdAt, startOfMonth))
    );

  return Number(row?.count ?? 0);
}

export async function getMonthlyVoiceMeetingCount(
  userId: string
): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const [row] = await db
    .select({
      count: sql<string>`count(*)`,
    })
    .from(meetings)
    .where(
      and(
        eq(meetings.userId, userId),
        gte(meetings.createdAt, startOfMonth),
        sql`coalesce((${meetings.metadata}->>'silent')::boolean, false) = false`
      )
    );

  return Number(row?.count ?? 0);
}

export async function getEnabledMcpServerCount(
  userId: string
): Promise<number> {
  const [row] = await db
    .select({ count: sql<string>`count(*)` })
    .from(mcpServers)
    .where(and(eq(mcpServers.userId, userId), eq(mcpServers.enabled, true)));
  return Number(row?.count ?? 0);
}

// ---------------------------------------------------------------------------
// Counting queries for limit enforcement
// ---------------------------------------------------------------------------

export async function getActiveMeetingCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<string>`count(*)` })
    .from(meetings)
    .where(
      and(
        eq(meetings.userId, userId),
        sql`${meetings.status} in ('joining', 'active')`
      )
    );
  return Number(row?.count ?? 0);
}

export async function getUsedMinutes(
  userId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<number> {
  const [row] = await db
    .select({
      total: sql<string>`coalesce(sum(${usageEvents.quantity}), '0')`,
    })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.userId, userId),
        sql`${usageEvents.type} in ('voice_meeting', 'silent_meeting')`,
        gte(usageEvents.createdAt, periodStart),
        lte(usageEvents.createdAt, periodEnd)
      )
    );
  return Number(row?.total ?? 0);
}

export async function getDocumentCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<string>`count(*)` })
    .from(documents)
    .where(eq(documents.userId, userId));
  return Number(row?.count ?? 0);
}

export async function getMonthlyDocUploads(userId: string): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const [row] = await db
    .select({
      count: sql<string>`coalesce(sum(${usageEvents.quantity}), '0')`,
    })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.userId, userId),
        eq(usageEvents.type, "doc_upload"),
        gte(usageEvents.createdAt, startOfMonth)
      )
    );
  return Number(row?.count ?? 0);
}

export async function getTotalStorageMB(userId: string): Promise<number> {
  const [row] = await db
    .select({
      totalBytes: sql<string>`coalesce(sum(${documents.fileSize}), '0')`,
    })
    .from(documents)
    .where(eq(documents.userId, userId));
  return Number(row?.totalBytes ?? 0) / (1024 * 1024);
}

// ---------------------------------------------------------------------------
// Get user's effective billing period
// ---------------------------------------------------------------------------

export function getEffectivePeriod(user: {
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
}): { start: Date; end: Date } {
  if (user.currentPeriodStart && user.currentPeriodEnd) {
    return { start: user.currentPeriodStart, end: user.currentPeriodEnd };
  }
  // Default: current calendar month
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end };
}

// ---------------------------------------------------------------------------
// Sync usage to Polar meters (fire-and-forget after meetings end)
// ---------------------------------------------------------------------------

/**
 * Sync a usage event to Polar's metered billing.
 * Returns true if sync succeeded, false if it failed or was skipped.
 */
export async function syncUsageToPolar(
  userId: string,
  meetingId: string,
  type: "voice_meeting" | "silent_meeting",
  durationMinutes: number
): Promise<boolean> {
  try {
    const { isPolarEnabled, getPolar } = await import("@/lib/polar");
    if (!isPolarEnabled()) return false;

    const [user] = await db
      .select({ polarCustomerId: users.polarCustomerId })
      .from(users)
      .where(eq(users.id, userId));

    if (!user?.polarCustomerId) return false;

    const polar = getPolar();
    const hours = durationMinutes / 60;
    const rate =
      type === "voice_meeting" ? USAGE_RATES.voice : USAGE_RATES.silent;
    const costEur = hours * rate;

    // Single "meeting_usage" meter — Polar aggregates cost_eur, applies monthly credit
    await polar.events.ingest({
      events: [
        {
          name: "meeting_usage",
          externalCustomerId: userId,
          externalId: `meeting_${meetingId}`,
          metadata: {
            meeting_id: meetingId,
            meeting_type: type === "voice_meeting" ? "voice" : "silent",
            duration_minutes: durationMinutes,
            duration_hours: hours,
            cost_eur: costEur,
          },
        },
      ],
    });

    // Mark the usage event as synced — separate try/catch so a DB failure
    // doesn't mask a successful Polar ingest. Worst case: Polar gets a
    // duplicate on retry (deduplicated by externalId).
    try {
      await db
        .update(usageEvents)
        .set({ polarSyncedAt: new Date() })
        .where(
          and(
            eq(usageEvents.userId, userId),
            eq(usageEvents.meetingId, meetingId),
            eq(usageEvents.type, type)
          )
        );
    } catch (dbErr) {
      console.error("[Billing] polarSyncedAt update failed:", dbErr);
    }

    return true;
  } catch (err) {
    console.error("[Billing] Failed to sync usage to Polar:", err);
    return false;
  }
}
