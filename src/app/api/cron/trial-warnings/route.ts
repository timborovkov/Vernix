import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { and, eq, gte, lt, isNull } from "drizzle-orm";
import { sendEmail } from "@/lib/email/send";
import { getTrialExpiryWarningHtml } from "@/lib/email/templates";

/**
 * Cron endpoint: sends trial expiry warning emails.
 * Call daily via scheduler (e.g. Railway cron, Vercel cron, or external).
 * Protected by CRON_SECRET header to prevent unauthorized access.
 *
 * Sends warnings at 3 days and 1 day before trial expires.
 */
export async function GET(request: Request) {
  const secret = request.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const sent: string[] = [];

  // Find users whose trial ends in exactly 3 days or 1 day (within a 24h window)
  for (const daysLeft of [3, 1]) {
    const windowStart = new Date(now);
    windowStart.setDate(windowStart.getDate() + daysLeft);
    windowStart.setHours(0, 0, 0, 0);

    const windowEnd = new Date(windowStart);
    windowEnd.setDate(windowEnd.getDate() + 1);

    const expiringUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
      })
      .from(users)
      .where(
        and(
          eq(users.plan, "free"),
          isNull(users.polarSubscriptionId),
          gte(users.trialEndsAt, windowStart),
          lt(users.trialEndsAt, windowEnd)
        )
      );

    for (const user of expiringUsers) {
      const html = getTrialExpiryWarningHtml(user.name, daysLeft);
      const subject =
        daysLeft <= 1
          ? "Your Vernix Pro trial expires tomorrow"
          : `Your Vernix Pro trial expires in ${daysLeft} days`;

      await sendEmail({ to: user.email, subject, html });
      sent.push(`${user.email} (${daysLeft}d)`);
    }
  }

  console.log(
    `[Trial Warnings] Sent ${sent.length} emails:`,
    sent.join(", ") || "none"
  );

  return NextResponse.json({ sent: sent.length, emails: sent });
}
