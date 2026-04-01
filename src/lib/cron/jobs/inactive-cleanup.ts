import { db } from "@/lib/db";
import { users, meetings } from "@/lib/db/schema";
import { and, eq, isNull, lt, or, sql } from "drizzle-orm";

/**
 * Detect inactive free-plan accounts (no activity in 180 days).
 * Currently informational only — logs inactive users for monitoring.
 * Actual archival/deletion requires a warning email flow first.
 */
export async function runInactiveCleanup() {
  const cutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000); // 180 days

  // Find free-plan users who haven't been active in 180 days
  // and have no recent meetings
  const inactive = await db
    .select({
      id: users.id,
      email: users.email,
      lastActiveAt: users.lastActiveAt,
    })
    .from(users)
    .where(
      and(
        eq(users.plan, "free"),
        or(
          and(isNull(users.lastActiveAt), lt(users.createdAt, cutoff)),
          lt(users.lastActiveAt, cutoff)
        )
      )
    )
    .limit(100);

  // Filter out users who have recent meetings (secondary activity check)
  let flagged = 0;
  for (const user of inactive) {
    const [recentMeeting] = await db
      .select({ id: meetings.id })
      .from(meetings)
      .where(
        and(
          eq(meetings.userId, user.id),
          sql`${meetings.createdAt} > ${cutoff}`
        )
      )
      .limit(1);

    if (!recentMeeting) {
      flagged++;
    }
  }

  if (flagged > 0) {
    console.log(
      `[Inactive Cleanup] ${flagged} inactive free accounts detected (informational)`
    );
  }
  return { flagged };
}
