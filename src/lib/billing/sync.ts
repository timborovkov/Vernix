import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isPolarEnabled, getPolar } from "@/lib/polar";
import { PLANS, FREE_TRIAL } from "./constants";

/**
 * Sync a user's billing state with Polar.
 * Queries Polar for the customer's active subscription and updates the
 * local DB to match. Handles trialing vs active vs no subscription.
 *
 * Call this on billing page load to reconcile stale state.
 */
export async function syncBillingFromPolar(
  userId: string
): Promise<{ synced: boolean }> {
  if (!isPolarEnabled()) return { synced: false };

  const [user] = await db
    .select({
      polarCustomerId: users.polarCustomerId,
      plan: users.plan,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!user?.polarCustomerId) return { synced: false };

  try {
    const polar = getPolar();

    // Get customer state from Polar (includes subscriptions)
    const customerState = await polar.customers.getState({
      id: user.polarCustomerId,
    });

    const activeSub = customerState.activeSubscriptions?.[0];

    if (!activeSub) {
      // No active subscription, ensure user is on free with no trial
      await db
        .update(users)
        .set({
          plan: PLANS.FREE,
          polarSubscriptionId: null,
          trialEndsAt: null,
          currentPeriodStart: null,
          currentPeriodEnd: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
      return { synced: true };
    }

    const isTrialing = activeSub.status === "trialing";

    if (isTrialing) {
      // Polar trial: keep plan as free, set trial end date
      const trialEndsAt = activeSub.trialEnd
        ? new Date(activeSub.trialEnd)
        : new Date(Date.now() + FREE_TRIAL.days * 24 * 60 * 60 * 1000);

      await db
        .update(users)
        .set({
          plan: PLANS.FREE,
          polarSubscriptionId: activeSub.id,
          trialEndsAt,
          currentPeriodStart: new Date(activeSub.currentPeriodStart),
          currentPeriodEnd: new Date(activeSub.currentPeriodEnd),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    } else if (
      activeSub.status === "active" ||
      activeSub.status === "past_due"
    ) {
      // Active subscription: set Pro
      await db
        .update(users)
        .set({
          plan: PLANS.PRO,
          polarSubscriptionId: activeSub.id,
          currentPeriodStart: new Date(activeSub.currentPeriodStart),
          currentPeriodEnd: new Date(activeSub.currentPeriodEnd),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    }
    return { synced: true };
  } catch (err) {
    console.error("[Billing Sync] Failed to sync from Polar:", err);
    return { synced: false };
  }
}
