import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { sendEmail } from "@/lib/email/send";
import { getContactNotificationHtml } from "@/lib/email/templates";
import { rateLimitByIp } from "@/lib/rate-limit";

const contactSchema = z.object({
  topic: z.enum(["question", "bug", "feature", "enterprise"]),
  email: z.email(),
  name: z.string().optional(),
  company: z.string().optional(),
  message: z.string().min(1, "Message is required"),
});

const TOPIC_LABELS: Record<string, string> = {
  question: "General question",
  bug: "Bug report",
  feature: "Feature request",
  enterprise: "Enterprise inquiry",
};

export async function POST(request: Request) {
  const rl = rateLimitByIp(request, "contact:submit", {
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

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { topic, email, name, company, message } = parsed.data;
  const topicLabel = TOPIC_LABELS[topic] ?? topic;

  const result = await sendEmail({
    to: "hello@vernix.app",
    subject: `[${topicLabel}] from ${name || email}`,
    html: getContactNotificationHtml({
      topic: topicLabel,
      email,
      name,
      company,
      message,
    }),
    replyTo: email,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: "Failed to send message. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
