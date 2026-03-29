import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function POST() {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  await db
    .update(users)
    .set({ termsAcceptedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, user.id));

  return NextResponse.json({ success: true });
}
