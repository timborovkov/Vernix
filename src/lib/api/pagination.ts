import { z } from "zod/v4";

// ---------------------------------------------------------------------------
// Cursor-based pagination
// ---------------------------------------------------------------------------

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

interface CursorData {
  createdAt: string; // ISO date
  id: string;
}

export function encodeCursor(createdAt: Date, id: string): string {
  const data: CursorData = { createdAt: createdAt.toISOString(), id };
  return Buffer.from(JSON.stringify(data)).toString("base64url");
}

export function decodeCursor(cursor: string): CursorData | null {
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf-8");
    const data = JSON.parse(json) as CursorData;
    if (typeof data.createdAt !== "string" || typeof data.id !== "string") {
      return null;
    }
    // Validate the date is parseable
    if (isNaN(new Date(data.createdAt).getTime())) return null;
    return data;
  } catch {
    return null;
  }
}

export interface PaginationMeta {
  nextCursor?: string;
  hasMore: boolean;
}

/**
 * Build pagination metadata from a query result.
 * Assumes the query fetched `limit + 1` rows.
 */
export function buildPaginationMeta<
  T extends { createdAt: Date | string; id: string },
>(items: T[], limit: number): { data: T[]; meta: PaginationMeta } {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const last = data[data.length - 1];

  return {
    data,
    meta: {
      hasMore,
      ...(hasMore && last
        ? {
            nextCursor: encodeCursor(
              last.createdAt instanceof Date
                ? last.createdAt
                : new Date(last.createdAt),
              last.id
            ),
          }
        : {}),
    },
  };
}
