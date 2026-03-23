const buckets = new Map<string, { count: number; resetAt: number }>();

/** Clear all rate limit buckets (for testing). */
export function resetRateLimits(): void {
  buckets.clear();
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
