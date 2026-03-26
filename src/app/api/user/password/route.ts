import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { hash, compare } from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireSessionUser } from "@/lib/auth/session";

const changePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
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

  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { currentPassword, newPassword } = parsed.data;

  // Fetch user to check current password state
  const [user] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userOrRes.id));

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // If user has a password, verify current password
  if (user.passwordHash) {
    if (!currentPassword) {
      return NextResponse.json(
        { error: "Current password is required" },
        { status: 400 }
      );
    }
    const valid = await compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }
  }

  // Hash and set new password
  const passwordHash = await hash(newPassword, 12);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userOrRes.id));

  return NextResponse.json({ success: true });
}
