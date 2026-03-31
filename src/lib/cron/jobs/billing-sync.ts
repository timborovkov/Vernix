import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { and, eq, isNotNull, lte } from "drizzle-orm";
import { syncBillingFromPolar } from "@/lib/billing/sync";

export async function runBillingSync() {
  const now = new Date();
  let syncedCount = 0;

  // Find Pro users whose billing period has ended (potential missed revoke)
  const staleProUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.plan, "pro"),
        isNotNull(users.polarCustomerId),
        isNotNull(users.currentPeriodEnd),
        lte(users.currentPeriodEnd, now)
      )
    );

  for (const user of staleProUsers) {
    try {
      const result = await syncBillingFromPolar(user.id);
      if (result.synced) syncedCount++;
    } catch (err) {
      console.error(`[Billing Sync] Failed for pro user ${user.id}:`, err);
    }
  }

  // Find free users with stale trialEndsAt (trial expired, needs cleanup)
  const staleTrialUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.plan, "free"),
        isNotNull(users.polarCustomerId),
        isNotNull(users.trialEndsAt),
        lte(users.trialEndsAt, now)
      )
    );

  for (const user of staleTrialUsers) {
    try {
      const result = await syncBillingFromPolar(user.id);
      if (result.synced) syncedCount++;
    } catch (err) {
      console.error(`[Billing Sync] Failed for trial user ${user.id}:`, err);
    }
  }

  console.log(`[Billing Sync Cron] Synced ${syncedCount} users`);
  return { synced: syncedCount };
}
