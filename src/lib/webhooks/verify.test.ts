import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { verifyRecallSignature } from "./verify";

const SECRET = "test-webhook-secret";

function signBody(body: string): string {
  return createHmac("sha256", SECRET).update(body).digest("hex");
}

describe("verifyRecallSignature", () => {
  it("returns valid for correct signature", async () => {
    const body = JSON.stringify({ event: "test" });
    const sig = signBody(body);
    const req = new Request("http://localhost/webhook", {
      method: "POST",
      body,
      headers: { "x-recall-signature": sig },
    });

    const result = await verifyRecallSignature(req, SECRET);
    expect(result.valid).toBe(true);
    expect(result.body).toBe(body);
  });

  it("returns invalid for wrong signature", async () => {
    const body = JSON.stringify({ event: "test" });
    const req = new Request("http://localhost/webhook", {
      method: "POST",
      body,
      headers: { "x-recall-signature": "invalid" },
    });

    const result = await verifyRecallSignature(req, SECRET);
    expect(result.valid).toBe(false);
  });

  it("returns invalid when signature header is missing", async () => {
    const body = JSON.stringify({ event: "test" });
    const req = new Request("http://localhost/webhook", {
      method: "POST",
      body,
    });

    const result = await verifyRecallSignature(req, SECRET);
    expect(result.valid).toBe(false);
  });
});
