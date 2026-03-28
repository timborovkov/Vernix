import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireSessionUser } from "@/lib/auth/session";
import { getUsageSummary, getEffectivePeriod } from "@/lib/billing/usage";
import {
  getEffectiveLimits,
  isTrialActive,
  getTrialDaysRemaining,
} from "@/lib/billing/limits";
import type { Plan } from "@/lib/billing/constants";

export async function GET() {
  const sessionUser = await requireSessionUser();
  if (sessionUser instanceof NextResponse) return sessionUser;

  const [user] = await db
    .select({
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

  const plan = user.plan as Plan;
  const period = getEffectivePeriod(user);
  const usage = await getUsageSummary(
    sessionUser.id,
    plan,
    period.start,
    period.end
  );
  const limits = getEffectiveLimits(plan, user.trialEndsAt);
  const trialing = isTrialActive(plan, user.trialEndsAt);
  const trialDaysRemaining = getTrialDaysRemaining(user.trialEndsAt);

  return NextResponse.json({
    plan,
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
  });
}
