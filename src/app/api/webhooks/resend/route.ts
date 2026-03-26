import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { sendEmail } from "@/lib/email/send";
import { escapeHtml } from "@/lib/email/templates";
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

  // Only process inbound emails — acknowledge everything else with 200
  if (eventType !== "email.received") {
    return NextResponse.json({ received: true, event: eventType });
  }

  // Handle inbound email forwarding
  const data = payload.data as
    | {
        from?: string;
        to?: string[];
        subject?: string;
        text?: string;
        html?: string;
      }
    | undefined;

  const from = data?.from;
  const subject = data?.subject;

  if (!from || !subject) {
    console.log(
      "[Webhook:resend] Inbound email missing from/subject, skipping"
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

  console.log(
    `[Webhook:resend] Forwarding inbound email from ${from} to ${recipients.join(", ")}`
  );

  // Add forwarded-from header to distinguish from regular Vernix emails
  const forwardHeader = `<div style="padding:12px 16px;background:#f5f5f5;border-radius:8px;margin-bottom:16px;font-size:13px;color:#666">Forwarded from <strong>${escapeHtml(from)}</strong> to <strong>${escapeHtml((data?.to ?? []).join(", "))}</strong></div>`;

  const emailBody =
    data?.html ??
    `<pre style="font-family:sans-serif;white-space:pre-wrap">${escapeHtml(data?.text ?? "")}</pre>`;

  const result = await sendEmail({
    to: recipients,
    subject: `[Fwd] ${subject}`,
    html: forwardHeader + emailBody,
    text: data?.text ?? undefined,
    replyTo: from,
  });

  if (!result.success) {
    console.error("[Webhook:resend] Forward failed:", result.error);
    return NextResponse.json({ error: "Forward failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
