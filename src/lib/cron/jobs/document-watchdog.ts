import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { and, eq, lte } from "drizzle-orm";

/**
 * Detect documents stuck in 'processing' status for too long and mark them failed.
 * A document should process within a few minutes; 30 minutes indicates a crash or hang.
 */
export async function runDocumentWatchdog() {
  const timeout = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes

  const stuck = await db
    .select({ id: documents.id })
    .from(documents)
    .where(
      and(eq(documents.status, "processing"), lte(documents.updatedAt, timeout))
    )
    .limit(20);

  let marked = 0;
  for (const doc of stuck) {
    try {
      await db
        .update(documents)
        .set({
          status: "failed",
          error: "Processing timed out",
          updatedAt: new Date(),
        })
        .where(
          and(eq(documents.id, doc.id), eq(documents.status, "processing"))
        );
      marked++;
    } catch (err) {
      console.error(
        `[Document Watchdog] Failed to mark document ${doc.id}:`,
        err
      );
    }
  }

  if (marked > 0) {
    console.log(
      `[Document Watchdog] Marked ${marked} stuck documents as failed`
    );
  }
  return { marked };
}
