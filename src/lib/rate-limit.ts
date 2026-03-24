const MAX_BUCKETS = 10_000;
const buckets = new Map<string, { count: number; resetAt: number }>();

// Evict expired entries periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of buckets) {
      if (now >= entry.resetAt) {
        // eslint-disable-next-line drizzle/enforce-delete-with-where -- Map.delete
        buckets.delete(key);
      }
    }
  }, 60_000);
}

/** Clear all rate limit buckets (for testing). */
export function resetRateLimits(): void {
  buckets.clear();
}

/** Clear a single rate limit bucket by key. */
export function resetRateLimitKey(key: string): void {
  // eslint-disable-next-line drizzle/enforce-delete-with-where -- Map.delete
  buckets.delete(key);
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
}

export function rateLimit(
  key: string,
  opts: { interval: number; limit: number }
): RateLimitResult {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now >= entry.resetAt) {
    // Cap bucket count to prevent memory exhaustion
    if (buckets.size >= MAX_BUCKETS) {
      // Evict oldest expired entries; if none, allow growth
      for (const [k, v] of buckets) {
        if (now >= v.resetAt) {
          // eslint-disable-next-line drizzle/enforce-delete-with-where -- Map.delete
          buckets.delete(k);
        }
      }
    }
    buckets.set(key, { count: 1, resetAt: now + opts.interval });
    return { success: true, remaining: opts.limit - 1 };
  }

  if (entry.count >= opts.limit) {
    return { success: false, remaining: 0 };
  }

  entry.count++;
  return { success: true, remaining: opts.limit - entry.count };
}

export function getClientIp(request: Request): string {
  // Prefer x-real-ip (set by trusted proxies like Vercel/Nginx)
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return "unknown";
}

export function rateLimitByIp(
  request: Request,
  endpoint: string,
  opts: { interval: number; limit: number }
): RateLimitResult {
  const ip = getClientIp(request);
  return rateLimit(`${endpoint}:${ip}`, opts);
}
