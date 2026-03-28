import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getEffectiveLimits, type LimitCheck } from "./limits";
import { getEffectivePeriod } from "./usage";
import type { Plan } from "./constants";

export async function getUserBilling(userId: string) {
  const [user] = await db
    .select({
      plan: users.plan,
      trialEndsAt: users.trialEndsAt,
      polarSubscriptionId: users.polarSubscriptionId,
      currentPeriodStart: users.currentPeriodStart,
      currentPeriodEnd: users.currentPeriodEnd,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) throw new Error("User not found");
  return user;
}

export async function requireLimits(userId: string) {
  const billing = await getUserBilling(userId);
  const plan = billing.plan as Plan;
  // Trial requires a Polar subscription (trial is Polar-only, not internal)
  const effectiveTrialEndsAt = billing.polarSubscriptionId
    ? billing.trialEndsAt
    : null;
  const limits = getEffectiveLimits(plan, effectiveTrialEndsAt);
  const period = getEffectivePeriod(billing);
  return { limits, period, plan };
}

export function billingError(
  check: LimitCheck,
  status: 403 | 429 = 403
): NextResponse {
  return NextResponse.json(
    {
      error: check.reason,
      code: status === 429 ? "RATE_LIMITED" : "LIMIT_EXCEEDED",
    },
    { status }
  );
}
