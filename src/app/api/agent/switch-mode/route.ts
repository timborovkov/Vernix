import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { rateLimitByIp } from "@/lib/rate-limit";
import { verifyBotSecret } from "@/lib/agent/verify-bot-secret";

const switchModeSchema = z.object({
  meetingId: z.uuid(),
  botSecret: z.string().min(1, "Bot secret is required"),
});

export async function POST(request: Request) {
  const rl = rateLimitByIp(request, "agent:switch-mode", {
    interval: 60_000,
    limit: 5,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = switchModeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { meetingId, botSecret } = parsed.data;

  const [meeting] = await db
    .select()
    .from(meetings)
    .where(eq(meetings.id, meetingId));

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  // Verify bot secret
  const metadata = (meeting.metadata ?? {}) as Record<string, unknown>;

  if (!verifyBotSecret(metadata, botSecret)) {
    return NextResponse.json({ error: "Invalid bot secret" }, { status: 403 });
  }

  if (meeting.status !== "active") {
    return NextResponse.json(
      {
        error: `Cannot switch mode for meeting with status: ${meeting.status}`,
      },
      { status: 400 }
    );
  }

  if (!meeting.userId) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  // Update metadata: enable silent mode, clear voice secret
  await db
    .update(meetings)
    .set({
      metadata: { ...metadata, silent: true, voiceSecret: null },
      updatedAt: new Date(),
    })
    .where(
      and(eq(meetings.id, meetingId), eq(meetings.userId, meeting.userId))
    );

  return NextResponse.json({ success: true });
}
