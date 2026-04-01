import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/auth/api-key";
import { rateLimit } from "@/lib/rate-limit";
import { requireLimits } from "@/lib/billing/enforce";
import { canMakeApiRequest } from "@/lib/billing/limits";
import { getDailyCount, recordUsageEvent } from "@/lib/billing/usage";
import { apiError } from "./response";
import {
  API_VERSION,
  RATE_LIMIT_STANDARD,
  RATE_LIMIT_WINDOW_MS,
} from "./constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiUser {
  id: string;
  email: string;
  name: string;
}

type ApiHandler = (
  request: Request,
  user: ApiUser,
  context: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

interface WithApiAuthOptions {
  /** Requests per minute. Default: RATE_LIMIT_STANDARD (60) */
  ratePerMinute?: number;
  /** Endpoint name for rate-limit key bucketing */
  endpoint: string;
  /** Skip billing-level API request check (e.g. for openapi.json) */
  skipBilling?: boolean;
}

// ---------------------------------------------------------------------------
// Higher-order handler: authenticate, rate-limit, bill, set headers
// ---------------------------------------------------------------------------

export function withApiAuth(handler: ApiHandler, options: WithApiAuthOptions) {
  const {
    ratePerMinute = RATE_LIMIT_STANDARD,
    endpoint,
    skipBilling = false,
  } = options;

  return async (
    request: Request,
    context: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    // 1. Authenticate
    const user = await authenticateApiKey(request);
    if (!user) {
      return apiError("UNAUTHORIZED", "Invalid or missing API key", 401);
    }

    // 2. Rate limit (per-user, per-endpoint)
    const rl = rateLimit(`api:${API_VERSION}:${user.id}:${endpoint}`, {
      interval: RATE_LIMIT_WINDOW_MS,
      limit: ratePerMinute,
    });
    if (!rl.success) {
      return apiError("RATE_LIMITED", "Too many requests", 429);
    }

    // 3. Billing check
    if (!skipBilling) {
      const { limits } = await requireLimits(user.id);
      const dailyApiCount = await getDailyCount(user.id, "api_request");
      const check = canMakeApiRequest(limits, dailyApiCount);
      if (!check.allowed) {
        const status = !limits.apiEnabled ? 403 : 429;
        return apiError(
          status === 403 ? "BILLING_LIMIT" : "RATE_LIMITED",
          check.reason!,
          status
        );
      }

      // Record usage (fire-and-forget)
      recordUsageEvent(user.id, "api_request").catch((e) =>
        console.error("[Billing] API usage recording failed:", e)
      );
    }

    // 4. Call handler
    const response = await handler(request, user, context);

    // 5. Set standard headers
    response.headers.set("X-API-Version", API_VERSION);
    response.headers.set("X-RateLimit-Limit", String(ratePerMinute));
    response.headers.set("X-RateLimit-Remaining", String(rl.remaining));

    return response;
  };
}
