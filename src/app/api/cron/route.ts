import { NextResponse } from "next/server";
import { runDueCronJobs } from "@/lib/cron";

/**
 * Unified cron dispatcher. Called every 5 minutes from a single Railway
 * cron service. Determines which jobs are due and runs them.
 *
 * Schedule: every 5 minutes
 * Auth: Bearer CRON_SECRET
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const secret = request.headers.get("authorization");
  if (!cronSecret || secret !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await runDueCronJobs();

  console.log(
    `[Cron] Ran: [${summary.ran.join(", ")}] | Skipped: [${summary.skipped.join(", ")}]`
  );

  return NextResponse.json(summary);
}
