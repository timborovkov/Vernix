import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { requireSessionUser } from "@/lib/auth/session";
import { generateApiKey } from "@/lib/auth/api-key";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
});

export async function GET() {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const keys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, user.id))
    .orderBy(desc(apiKeys.createdAt));

  return NextResponse.json({ keys });
}

export async function POST(request: Request) {
  const user = await requireSessionUser();
  if (user instanceof NextResponse) return user;

  const body = await request.json();
  const parsed = createKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { raw, hash, prefix } = await generateApiKey();

  const [key] = await db
    .insert(apiKeys)
    .values({
      userId: user.id,
      name: parsed.data.name,
      keyHash: hash,
      keyPrefix: prefix,
    })
    .returning();

  return NextResponse.json(
    {
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      createdAt: key.createdAt,
      rawKey: raw, // Shown only once
    },
    { status: 201 }
  );
}
