import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/send";
import { escapeHtml } from "@/lib/email/templates";
import { rateLimitByIp } from "@/lib/rate-limit";

// All Resend webhook event types
// https://resend.com/docs/dashboard/webhooks/event-types
const HANDLED_EVENTS = ["email.received"] as const;
const KNOWN_EVENTS = [
  "email.sent",
  "email.delivered",
  "email.delivery_delayed",
  "email.complained",
  "email.bounced",
  "email.opened",
  "email.clicked",
  "email.received",
] as const;

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

  // TODO: Verify Svix signature using webhookSecret
  // Resend uses Svix for webhook delivery — signature is in svix-id, svix-timestamp, svix-signature headers

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const payload = body as { type?: string; data?: Record<string, unknown> };
  const eventType = payload.type;

  if (!eventType) {
    return NextResponse.json({ error: "Missing event type" }, { status: 400 });
  }

  // Log all events for observability
  const isKnown = (KNOWN_EVENTS as readonly string[]).includes(eventType);
  if (!isKnown) {
    console.log(`[Webhook:resend] Unknown event type: ${eventType}`);
  }

  // Only process inbound emails — acknowledge everything else with 200
  if (!HANDLED_EVENTS.includes(eventType as (typeof HANDLED_EVENTS)[number])) {
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

  const result = await sendEmail({
    to: recipients,
    subject: `[Fwd] ${subject}`,
    html:
      data?.html ??
      `<pre style="font-family:sans-serif;white-space:pre-wrap">${escapeHtml(data?.text ?? "")}</pre>`,
    text: data?.text ?? undefined,
    replyTo: from,
  });

  if (!result.success) {
    console.error("[Webhook:resend] Forward failed:", result.error);
    return NextResponse.json({ error: "Forward failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
