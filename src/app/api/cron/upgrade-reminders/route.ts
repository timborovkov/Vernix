import { NextResponse } from "next/server";
import { and, eq, isNull, lte, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/send";
import { getFreePlanUpgradeReminderHtml } from "@/lib/email/templates";

/**
 * Cron endpoint: sends weekly upgrade reminders to free users.
 * Protected by CRON_SECRET header to prevent unauthorized access.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const secret = request.headers.get("authorization");
  if (!cronSecret || secret !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const eligibleUsers = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
    })
    .from(users)
    .where(
      and(
        eq(users.plan, "free"),
        or(isNull(users.trialEndsAt), lte(users.trialEndsAt, now)),
        or(
          isNull(users.lastUpgradeReminderSentAt),
          lte(users.lastUpgradeReminderSentAt, sevenDaysAgo)
        )
      )
    );

  const sent: string[] = [];
  for (const user of eligibleUsers) {
    await sendEmail({
      to: user.email,
      subject: "Unlock more with Vernix Pro",
      html: getFreePlanUpgradeReminderHtml(user.name),
    });

    await db
      .update(users)
      .set({
        lastUpgradeReminderSentAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, user.id));

    sent.push(user.email);
  }

  console.log(
    `[Upgrade Reminders] Sent ${sent.length} emails:`,
    sent.join(", ") || "none"
  );

  return NextResponse.json({ sent: sent.length, emails: sent });
}
