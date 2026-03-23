import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiKeys, users } from "@/lib/db/schema";

const KEY_PREFIX = "kk_";

export async function generateApiKey(): Promise<{
  raw: string;
  hash: string;
  prefix: string;
}> {
  const raw = `${KEY_PREFIX}${randomBytes(16).toString("hex")}`;
  const hash = await bcrypt.hash(raw, 10);
  const prefix = raw.slice(0, 7);
  return { raw, hash, prefix };
}

export async function authenticateApiKey(
  request: Request
): Promise<{ id: string; email: string; name: string } | null> {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer kk_")) return null;

  const rawKey = auth.slice(7); // Remove "Bearer "
  const prefix = rawKey.slice(0, 7);

  // Look up keys by prefix for efficiency
  const keys = await db
    .select({
      keyId: apiKeys.id,
      keyHash: apiKeys.keyHash,
      userId: apiKeys.userId,
      userName: users.name,
      userEmail: users.email,
    })
    .from(apiKeys)
    .innerJoin(users, eq(apiKeys.userId, users.id))
    .where(eq(apiKeys.keyPrefix, prefix));

  for (const key of keys) {
    if (await bcrypt.compare(rawKey, key.keyHash)) {
      // Update last used timestamp (fire and forget)
      db.update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeys.id, key.keyId))
        .then(() => {})
        .catch(() => {});

      return { id: key.userId, email: key.userEmail, name: key.userName };
    }
  }

  return null;
}
