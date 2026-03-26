import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { rateLimitByIp } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = rateLimitByIp(request, "agent:mute-status", {
    interval: 60_000,
    limit: 120,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const meetingId = searchParams.get("meetingId");
  const botSecret = searchParams.get("botSecret");

  if (!meetingId || !botSecret) {
    return NextResponse.json(
      { error: "meetingId and botSecret are required" },
      { status: 400 }
    );
  }

  const [meeting] = await db
    .select({ metadata: meetings.metadata })
    .from(meetings)
    .where(eq(meetings.id, meetingId));

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const metadata = (meeting.metadata ?? {}) as Record<string, unknown>;

  // Accept voiceSecret (voice mode) or botId (silent mode) for auth
  const storedVoiceSecret = metadata.voiceSecret;
  const storedBotId = metadata.botId;
  const validVoiceSecret =
    typeof storedVoiceSecret === "string" && storedVoiceSecret === botSecret;
  const validBotId =
    typeof storedBotId === "string" && storedBotId === botSecret;

  if (!validVoiceSecret && !validBotId) {
    return NextResponse.json({ error: "Invalid bot secret" }, { status: 403 });
  }

  return NextResponse.json({ muted: Boolean(metadata.muted) });
}
