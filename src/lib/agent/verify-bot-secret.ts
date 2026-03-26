/**
 * Verify a bot secret against meeting metadata.
 * Accepts voiceSecret (voice mode) or botId (silent mode) as valid credentials.
 */
export function verifyBotSecret(
  metadata: Record<string, unknown>,
  botSecret: string
): boolean {
  const storedVoiceSecret = metadata.voiceSecret;
  const storedBotId = metadata.botId;

  if (
    typeof storedVoiceSecret === "string" &&
    storedVoiceSecret === botSecret
  ) {
    return true;
  }
  if (typeof storedBotId === "string" && storedBotId === botSecret) {
    return true;
  }
  return false;
}
