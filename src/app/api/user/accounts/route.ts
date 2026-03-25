import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { users, accounts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireSessionUser } from "@/lib/auth/session";

export async function GET() {
  const userOrRes = await requireSessionUser();
  if (userOrRes instanceof NextResponse) return userOrRes;

  const linked = await db
    .select({
      id: accounts.id,
      provider: accounts.provider,
      providerAccountId: accounts.providerAccountId,
      createdAt: accounts.createdAt,
    })
    .from(accounts)
    .where(eq(accounts.userId, userOrRes.id));

  return NextResponse.json(linked);
}

const unlinkSchema = z.object({
  provider: z.string().min(1),
});

export async function DELETE(request: Request) {
  const userOrRes = await requireSessionUser();
  if (userOrRes instanceof NextResponse) return userOrRes;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = unlinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  // Check user has at least one other auth method before unlinking
  const [user] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userOrRes.id));

  const linkedAccounts = await db
    .select({ id: accounts.id, provider: accounts.provider })
    .from(accounts)
    .where(eq(accounts.userId, userOrRes.id));

  const hasPassword = !!user?.passwordHash;
  const otherAccounts = linkedAccounts.filter(
    (a) => a.provider !== parsed.data.provider
  );

  if (!hasPassword && otherAccounts.length === 0) {
    return NextResponse.json(
      {
        error:
          "Cannot unlink your only sign-in method. Set a password first or link another provider.",
      },
      { status: 400 }
    );
  }

  await db
    .delete(accounts)
    .where(
      and(
        eq(accounts.userId, userOrRes.id),
        eq(accounts.provider, parsed.data.provider)
      )
    );

  return NextResponse.json({ success: true });
}
