import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { users, accounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireSessionUser } from "@/lib/auth/session";

export async function GET() {
  const userOrRes = await requireSessionUser();
  if (userOrRes instanceof NextResponse) return userOrRes;

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      hasPassword: users.passwordHash,
      timezone: users.timezone,
      phone: users.phone,
      company: users.company,
      emailVerifiedAt: users.emailVerifiedAt,
      emailPreferences: users.emailPreferences,
    })
    .from(users)
    .where(eq(users.id, userOrRes.id));

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const linkedAccounts = await db
    .select({
      provider: accounts.provider,
      providerAccountId: accounts.providerAccountId,
      createdAt: accounts.createdAt,
    })
    .from(accounts)
    .where(eq(accounts.userId, userOrRes.id));

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    hasPassword: !!user.hasPassword,
    timezone: user.timezone,
    phone: user.phone,
    company: user.company,
    emailVerifiedAt: user.emailVerifiedAt,
    emailPreferences: user.emailPreferences,
    accounts: linkedAccounts,
  });
}

const VALID_TIMEZONES = new Set(Intl.supportedValuesOf("timeZone"));

const emailPreferencesSchema = z.object({
  marketing: z.boolean().optional(),
  product: z.boolean().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  timezone: z
    .string()
    .refine((tz) => VALID_TIMEZONES.has(tz), "Invalid timezone")
    .nullable()
    .optional(),
  phone: z.string().max(30).nullable().optional(),
  company: z.string().max(100).nullable().optional(),
  emailPreferences: emailPreferencesSchema.optional(),
});

export async function PATCH(request: Request) {
  const userOrRes = await requireSessionUser();
  if (userOrRes instanceof NextResponse) return userOrRes;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { name, timezone, phone, company, emailPreferences } = parsed.data;
  if (
    name === undefined &&
    timezone === undefined &&
    phone === undefined &&
    company === undefined &&
    emailPreferences === undefined
  ) {
    return NextResponse.json(
      { error: "At least one field required" },
      { status: 400 }
    );
  }

  const updates: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (timezone !== undefined) updates.timezone = timezone;
  if (phone !== undefined) updates.phone = phone;
  if (company !== undefined) updates.company = company;
  if (emailPreferences !== undefined) {
    // Merge with current DB state to avoid overwriting opt-outs from unsubscribe links
    const [current] = await db
      .select({ emailPreferences: users.emailPreferences })
      .from(users)
      .where(eq(users.id, userOrRes.id));
    const existing =
      (current?.emailPreferences as Record<string, unknown>) ?? {};
    updates.emailPreferences = { ...existing, ...emailPreferences };
  }

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, userOrRes.id))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      timezone: users.timezone,
    });

  return NextResponse.json(updated);
}
