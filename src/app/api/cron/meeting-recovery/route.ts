import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { and, eq, lte, sql } from "drizzle-orm";
import { getMeetingBotProvider } from "@/lib/meeting-bot";
import { processMeetingEnd } from "@/lib/agent/processing";

/**
 * Cron endpoint: recovers meetings stuck in transitional states.
 * Runs every 5 minutes. Protected by CRON_SECRET.
 *
 * - joining > 10 min → failed
 * - active > 30 min without webhook → check Recall, recover
 * - processing > 2 hours → re-run processing
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const secret = request.headers.get("authorization");
  if (!cronSecret || secret !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  let recovered = 0;

  // 1. Stuck in "joining" > 10 minutes → mark failed
  const joiningTimeout = new Date(now.getTime() - 10 * 60 * 1000);
  const staleJoining = await db
    .select({ id: meetings.id })
    .from(meetings)
    .where(
      and(
        eq(meetings.status, "joining"),
        lte(meetings.updatedAt, joiningTimeout)
      )
    );

  for (const m of staleJoining) {
    const [updated] = await db
      .update(meetings)
      .set({ status: "failed", updatedAt: now })
      .where(and(eq(meetings.id, m.id), eq(meetings.status, "joining")))
      .returning({ id: meetings.id });
    if (updated) {
      console.log(
        `[Meeting Recovery] Marked joining meeting ${m.id} as failed`
      );
      recovered++;
    }
  }

  // 2. Stuck in "active" > 30 minutes → check Recall bot status
  const activeTimeout = new Date(now.getTime() - 30 * 60 * 1000);
  const staleActive = await db
    .select({
      id: meetings.id,
      userId: meetings.userId,
      qdrantCollectionName: meetings.qdrantCollectionName,
      metadata: meetings.metadata,
      startedAt: meetings.startedAt,
      endedAt: meetings.endedAt,
      updatedAt: meetings.updatedAt,
      title: meetings.title,
      participants: meetings.participants,
    })
    .from(meetings)
    .where(
      and(eq(meetings.status, "active"), lte(meetings.updatedAt, activeTimeout))
    );

  const provider = getMeetingBotProvider();
  for (const m of staleActive) {
    const metadata = (m.metadata as Record<string, unknown>) ?? {};
    const botId = metadata.botId as string | undefined;

    if (!botId || !provider.getBot) {
      // No botId or no getBot method — mark as failed
      await db
        .update(meetings)
        .set({ status: "failed", updatedAt: now })
        .where(and(eq(meetings.id, m.id), eq(meetings.status, "active")));
      console.log(
        `[Meeting Recovery] Marked active meeting ${m.id} as failed (no botId)`
      );
      recovered++;
      continue;
    }

    try {
      const bot = await provider.getBot(botId);
      const lastStatus =
        bot.status_changes?.[bot.status_changes.length - 1]?.code;

      if (lastStatus === "done" || lastStatus === "fatal") {
        if (!m.userId) {
          // No userId — can't process, mark as failed
          await db
            .update(meetings)
            .set({ status: "failed", updatedAt: now })
            .where(and(eq(meetings.id, m.id), eq(meetings.status, "active")));
          console.warn(
            `[Meeting Recovery] Meeting ${m.id} has no userId, marked failed`
          );
          recovered++;
          continue;
        }
        // Bot has finished — process the meeting
        console.log(
          `[Meeting Recovery] Bot ${botId} is ${lastStatus}, processing meeting ${m.id}`
        );
        // Atomic: only transition if still active (webhook may have already handled it)
        const [updated] = await db
          .update(meetings)
          .set({
            status: "processing",
            endedAt: m.endedAt ?? now,
            updatedAt: now,
          })
          .where(and(eq(meetings.id, m.id), eq(meetings.status, "active")))
          .returning({ id: meetings.id });
        if (!updated) continue; // webhook already handled it

        await processMeetingEnd(m.id, m.userId, m.qdrantCollectionName, {
          ...metadata,
          title: m.title,
          startedAt: m.startedAt,
          endedAt: m.endedAt ?? now,
          participants: (m.participants as string[]) ?? [],
        });
        recovered++;
      } else {
        // Bot still in call — check if it's been too long (> 4 hours)
        // Use startedAt, fall back to updatedAt for age
        const ageRef = m.startedAt ?? m.updatedAt;
        const meetingAge = now.getTime() - new Date(ageRef).getTime();
        if (meetingAge > 4 * 60 * 60 * 1000) {
          if (!m.userId) {
            await db
              .update(meetings)
              .set({ status: "failed", updatedAt: now })
              .where(and(eq(meetings.id, m.id), eq(meetings.status, "active")));
            recovered++;
            continue;
          }
          console.log(
            `[Meeting Recovery] Meeting ${m.id} active > 4h, forcing leave`
          );
          try {
            await provider.leaveMeeting(botId);
          } catch {
            // Bot might already be gone
          }
          // Atomic: only transition if still active (webhook may have already handled it)
          const [updated] = await db
            .update(meetings)
            .set({
              status: "processing",
              endedAt: now,
              updatedAt: now,
            })
            .where(and(eq(meetings.id, m.id), eq(meetings.status, "active")))
            .returning({ id: meetings.id });
          if (!updated) continue; // webhook already handled it
          await processMeetingEnd(m.id, m.userId, m.qdrantCollectionName, {
            ...metadata,
            title: m.title,
            startedAt: m.startedAt,
            endedAt: now,
            participants: (m.participants as string[]) ?? [],
          });
          recovered++;
        }
      }
    } catch (err) {
      console.error(
        `[Meeting Recovery] Failed to check bot ${botId} for meeting ${m.id}:`,
        err
      );
    }
  }

  // 3. Stuck in "processing" > 2 hours → retry processing
  const processingTimeout = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const staleProcessing = await db
    .select({
      id: meetings.id,
      userId: meetings.userId,
      qdrantCollectionName: meetings.qdrantCollectionName,
      metadata: meetings.metadata,
      startedAt: meetings.startedAt,
      endedAt: meetings.endedAt,
      title: meetings.title,
      participants: meetings.participants,
    })
    .from(meetings)
    .where(
      and(
        eq(meetings.status, "processing"),
        lte(meetings.updatedAt, processingTimeout)
      )
    );

  for (const m of staleProcessing) {
    if (!m.userId) {
      await db
        .update(meetings)
        .set({ status: "failed", updatedAt: now })
        .where(and(eq(meetings.id, m.id), eq(meetings.status, "processing")));
      recovered++;
      continue;
    }
    // Bump updatedAt atomically to prevent concurrent retries from next cron run
    const [claimed] = await db
      .update(meetings)
      .set({ updatedAt: now })
      .where(
        and(
          eq(meetings.id, m.id),
          eq(meetings.status, "processing"),
          lte(meetings.updatedAt, processingTimeout)
        )
      )
      .returning({ id: meetings.id });
    if (!claimed) continue; // another cron run or webhook already handling it

    const metadata = (m.metadata as Record<string, unknown>) ?? {};
    console.log(
      `[Meeting Recovery] Retrying processing for stuck meeting ${m.id}`
    );
    try {
      await processMeetingEnd(m.id, m.userId, m.qdrantCollectionName, {
        ...metadata,
        title: m.title,
        startedAt: m.startedAt,
        endedAt: m.endedAt ?? now,
        participants: (m.participants as string[]) ?? [],
      });
      recovered++;
    } catch (err) {
      console.error(
        `[Meeting Recovery] Retry failed for meeting ${m.id}:`,
        err
      );
    }
  }

  // 4. Missing recordings — completed meetings without recordingKey, < 5h old
  const recordingWindow = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  const missingRecordings = await db
    .select({
      id: meetings.id,
      userId: meetings.userId,
      metadata: meetings.metadata,
    })
    .from(meetings)
    .where(
      and(
        eq(meetings.status, "completed"),
        sql`${meetings.metadata}->>'recordingKey' IS NULL`,
        sql`${meetings.metadata}->>'botId' IS NOT NULL`,
        sql`${meetings.endedAt} > ${recordingWindow}`
      )
    )
    .limit(10);

  // Recording capture is handled by the processing pipeline
  // Just log for visibility
  if (missingRecordings.length > 0) {
    console.log(
      `[Meeting Recovery] ${missingRecordings.length} recent meetings without recordings`
    );
  }

  console.log(`[Meeting Recovery] Recovered ${recovered} meetings`);
  return NextResponse.json({ recovered });
}
