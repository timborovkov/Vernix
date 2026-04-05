import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export interface ToolCallLogEntry {
  timestamp: number;
  toolName: string;
  args?: Record<string, unknown>;
  result?: string;
  durationMs: number;
  source: "voice" | "silent";
}

/**
 * Atomically append a tool call entry to metadata.toolCallLog.
 * Truncates result to avoid metadata bloat.
 */
export async function logToolCall(
  meetingId: string,
  entry: ToolCallLogEntry
): Promise<void> {
  const safeEntry: ToolCallLogEntry = {
    ...entry,
    result: entry.result?.slice(0, 500),
  };

  await db
    .update(meetings)
    .set({
      metadata: sql`jsonb_set(
        COALESCE(${meetings.metadata}, '{}'::jsonb),
        '{toolCallLog}',
        COALESCE(${meetings.metadata}->'toolCallLog', '[]'::jsonb) || ${JSON.stringify(safeEntry)}::jsonb
      )`,
      updatedAt: new Date(),
    })
    .where(eq(meetings.id, meetingId));
}
