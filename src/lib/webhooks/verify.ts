import { createHmac } from "crypto";

export async function verifyRecallSignature(
  request: Request,
  secret: string
): Promise<{ valid: boolean; body: string }> {
  const body = await request.text();
  const signature = request.headers.get("x-recall-signature");

  if (!signature) {
    return { valid: false, body };
  }

  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const valid = signature === expected;

  return { valid, body };
}
