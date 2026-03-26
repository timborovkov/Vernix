import { timingSafeEqual } from "crypto";

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Verify a bot secret against meeting metadata.
 * Accepts voiceSecret (voice mode) or botId (silent mode) as valid credentials.
 * Uses constant-time comparison to prevent timing attacks.
 */
export function verifyBotSecret(
  metadata: Record<string, unknown>,
  botSecret: string
): boolean {
  const storedVoiceSecret = metadata.voiceSecret;
  const storedBotId = metadata.botId;

  if (
    typeof storedVoiceSecret === "string" &&
    safeEqual(storedVoiceSecret, botSecret)
  ) {
    return true;
  }
  if (typeof storedBotId === "string" && safeEqual(storedBotId, botSecret)) {
    return true;
  }
  return false;
}
