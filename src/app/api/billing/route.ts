import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireSessionUser } from "@/lib/auth/session";
import {
  getUsageSummary,
  getEffectivePeriod,
  getMonthlyVoiceMeetingCount,
} from "@/lib/billing/usage";
import {
  ADMIN_LIMITS,
  getEffectiveLimits,
  isTrialActive,
  getTrialDaysRemaining,
} from "@/lib/billing/limits";
import { PLANS, type Plan } from "@/lib/billing/constants";
import { syncBillingFromPolar } from "@/lib/billing/sync";
import { isAdminUserEmail } from "@/lib/billing/admin";

export async function GET() {
  const sessionUser = await requireSessionUser();
  if (sessionUser instanceof NextResponse) return sessionUser;

  // Reconcile local state with Polar before returning billing data
  const syncResult = await syncBillingFromPolar(sessionUser.id);

  const [user] = await db
    .select({
      email: users.email,
      emailVerifiedAt: users.emailVerifiedAt,
      plan: users.plan,
      polarCustomerId: users.polarCustomerId,
      polarSubscriptionId: users.polarSubscriptionId,
      trialEndsAt: users.trialEndsAt,
      currentPeriodStart: users.currentPeriodStart,
      currentPeriodEnd: users.currentPeriodEnd,
    })
    .from(users)
    .where(eq(users.id, sessionUser.id));

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const isAdmin = !!user.emailVerifiedAt && isAdminUserEmail(user.email);
  const plan = isAdmin ? PLANS.PRO : (user.plan as Plan);
  const period = getEffectivePeriod(user);
  const [usage, voiceMeetingsUsed] = await Promise.all([
    getUsageSummary(sessionUser.id, plan, period.start, period.end),
    getMonthlyVoiceMeetingCount(sessionUser.id),
  ]);
  usage.voiceMeetingsUsed = voiceMeetingsUsed;
  // Trial is Polar-only: requires both trialEndsAt and an active subscription
  const effectiveTrialEndsAt = user.polarSubscriptionId
    ? user.trialEndsAt
    : null;
  const limits = isAdmin
    ? ADMIN_LIMITS
    : getEffectiveLimits(plan, effectiveTrialEndsAt);
  const trialing = isAdmin ? false : isTrialActive(plan, effectiveTrialEndsAt);
  const trialDaysRemaining = isAdmin
    ? 0
    : getTrialDaysRemaining(effectiveTrialEndsAt);

  return NextResponse.json({
    plan,
    isAdmin,
    trialing,
    trialDaysRemaining,
    trialEndsAt: user.trialEndsAt,
    hasSubscription: !!user.polarSubscriptionId,
    hasPolarCustomer: !!user.polarCustomerId,
    period: {
      start: period.start.toISOString(),
      end: period.end.toISOString(),
    },
    usage,
    limits,
    billingDataSynced: syncResult.synced,
  });
}
