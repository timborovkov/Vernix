import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { rateLimitByIp } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/send";
import { getWelcomeEmailHtml } from "@/lib/email/templates";

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
  termsAccepted: z.literal(true, {
    message: "You must accept the Terms of Use and Privacy Policy",
  }),
});

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  return "code" in error && (error as { code?: string }).code === "23505";
}

export async function POST(request: Request) {
  const rl = rateLimitByIp(request, "auth:register", {
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

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { email, password, name } = parsed.data;

  const passwordHash = await hash(password, 12);

  try {
    const [user] = await db
      .insert(users)
      .values({ email, name, passwordHash, termsAcceptedAt: new Date() })
      .returning({ id: users.id, email: users.email, name: users.name });

    // Fire-and-forget welcome email — don't block registration
    sendEmail({
      to: email,
      subject: "Welcome to Vernix",
      html: getWelcomeEmailHtml(name),
    }).catch((err) => console.error("[Register] Welcome email failed:", err));

    return NextResponse.json({ success: true, user });
  } catch (error) {
    // Handle unique constraint violation (concurrent registration)
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "An account with this email already exists. Try signing in." },
        { status: 409 }
      );
    }
    throw error;
  }
}
