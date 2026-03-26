import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { rateLimitByIp } from "@/lib/rate-limit";
import { verifyBotSecret } from "@/lib/agent/verify-bot-secret";
import { getActivationState, setActivationState } from "@/lib/agent/activation";

const activationStatusSchema = z.object({
  meetingId: z.uuid(),
  botSecret: z.string().min(1, "Bot secret is required"),
  // Optional: HTML page can update state
  state: z.enum(["responding", "cooldown", "idle"]).optional(),
});

export async function POST(request: Request) {
  const rl = rateLimitByIp(request, "agent:activation-status", {
    interval: 60_000,
    limit: 120,
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

  const parsed = activationStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { meetingId, botSecret, state: newState } = parsed.data;

  const [meeting] = await db
    .select({ metadata: meetings.metadata, userId: meetings.userId })
    .from(meetings)
    .where(eq(meetings.id, meetingId));

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const metadata = (meeting.metadata ?? {}) as Record<string, unknown>;

  if (!verifyBotSecret(metadata, botSecret)) {
    return NextResponse.json({ error: "Invalid bot secret" }, { status: 403 });
  }

  // If the HTML page is updating state
  if (newState && meeting.userId) {
    await setActivationState(meetingId, meeting.userId, newState);
  }

  const activation = await getActivationState(meetingId);

  return NextResponse.json({
    state: activation.state,
    muted: activation.muted,
    transcriptWindow: activation.transcriptWindow,
  });
}
