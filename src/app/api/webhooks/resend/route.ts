import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { getResend } from "@/lib/email/client";
import { suppressEmail } from "@/lib/email/suppression";
import { rateLimitByIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const rl = rateLimitByIp(request, "webhook:resend", {
    interval: 60_000,
    limit: 100,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Reject if webhook secret is not configured — prevents open relay
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 503 }
    );
  }

  // Verify Svix signature
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Missing webhook signature headers" },
      { status: 401 }
    );
  }

  let body: string;
  try {
    body = await request.text();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  let payload: { type?: string; data?: Record<string, unknown> };
  try {
    const wh = new Webhook(webhookSecret);
    payload = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as typeof payload;
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 401 }
    );
  }

  const eventType = payload.type;
  if (!eventType) {
    return NextResponse.json({ error: "Missing event type" }, { status: 400 });
  }

  if (eventType === "email.bounced") {
    const d = payload.data as
      | { to?: string[]; bounce?: { type?: string } }
      | undefined;
    const recipients = Array.isArray(d?.to) ? d.to : [];
    // Resend classifies bounces as "Permanent" / "Transient" / "Undetermined".
    // Only hard-suppress on Permanent; Transient is retriable so we log and move on.
    if (d?.bounce?.type === "Permanent") {
      for (const addr of recipients) {
        try {
          await suppressEmail(addr, "bounce");
        } catch (err) {
          console.error(
            `[Webhook:resend] Failed to suppress bounced address ${addr}:`,
            err
          );
        }
      }
    } else {
      console.log(
        `[Webhook:resend] Transient/undetermined bounce for ${recipients.join(", ") || "(no recipients)"}, not suppressing`
      );
    }
    return NextResponse.json({ received: true, event: eventType });
  }

  if (eventType === "email.complained") {
    const d = payload.data as { to?: string[] } | undefined;
    const recipients = Array.isArray(d?.to) ? d.to : [];
    for (const addr of recipients) {
      try {
        await suppressEmail(addr, "complaint");
      } catch (err) {
        console.error(
          `[Webhook:resend] Failed to record complaint for ${addr}:`,
          err
        );
      }
    }
    return NextResponse.json({ received: true, event: eventType });
  }

  // Only process inbound emails — acknowledge everything else with 200
  if (eventType !== "email.received") {
    return NextResponse.json({ received: true, event: eventType });
  }

  // Handle inbound email forwarding via Resend's passthrough forward API.
  // The webhook payload only contains metadata (no body/attachments).
  // Passthrough forward preserves the full original email server-side.
  const data = payload.data as
    | {
        email_id?: string;
        from?: string;
        subject?: string;
      }
    | undefined;

  const emailId = data?.email_id;
  const from = data?.from;
  const subject = data?.subject;

  if (!emailId || !from || !subject) {
    console.log(
      "[Webhook:resend] Inbound email missing email_id/from/subject, skipping"
    );
    return NextResponse.json({ skipped: true });
  }

  const forwardTo = process.env.EMAIL_FORWARD_TO;
  if (!forwardTo) {
    console.log(
      "[Webhook:resend] No EMAIL_FORWARD_TO configured, skipping forward"
    );
    return NextResponse.json({ received: true });
  }

  const recipients = forwardTo
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    return NextResponse.json({ received: true });
  }

  const resend = getResend();
  if (!resend) {
    console.error("[Webhook:resend] Resend client not configured");
    return NextResponse.json(
      { error: "Email client not configured" },
      { status: 503 }
    );
  }

  console.log(
    `[Webhook:resend] Forwarding inbound email from ${from} to ${recipients.join(", ")}`
  );

  const { error } = await resend.emails.receiving.forward({
    emailId,
    to: recipients,
    from: "Vernix <hello@vernix.app>",
  });

  if (error) {
    console.error("[Webhook:resend] Forward failed:", error);
    return NextResponse.json({ error: "Forward failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
