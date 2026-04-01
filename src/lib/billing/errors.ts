// ---------------------------------------------------------------------------
// Billing error detection for frontend use.
// API routes return { error: string, code: "BILLING_LIMIT" | "RATE_LIMITED" }
// with status 403 (feature gate) or 429 (quota exhausted).
// ---------------------------------------------------------------------------

const BILLING_CODES = ["BILLING_LIMIT", "RATE_LIMITED"] as const;
type BillingCode = (typeof BILLING_CODES)[number];

export class BillingApiError extends Error {
  code: BillingCode;
  status: number;

  constructor(message: string, code: BillingCode, status: number) {
    super(message);
    this.name = "BillingApiError";
    this.code = code;
    this.status = status;
  }

  /** True when the feature itself is locked (voice, API, storage cap) */
  get isFeatureGate(): boolean {
    return this.code === "BILLING_LIMIT";
  }

  /** True when a quota/rate limit is exhausted (resets next period) */
  get isQuotaExhausted(): boolean {
    return this.code === "RATE_LIMITED";
  }
}

export function isBillingError(error: unknown): error is BillingApiError {
  return error instanceof BillingApiError;
}

/**
 * Parse an API response and throw BillingApiError if it's a billing error.
 * Uses res.clone() so the original Response body remains consumable by the caller.
 */
export async function throwIfBillingError(res: Response): Promise<void> {
  if (res.status !== 403 && res.status !== 429) return;

  try {
    const data = await res.clone().json();
    if (data.code && BILLING_CODES.includes(data.code)) {
      throw new BillingApiError(
        data.error || "Limit reached",
        data.code,
        res.status
      );
    }
  } catch (e) {
    if (e instanceof BillingApiError) throw e;
    // JSON parse failed or no billing code, let caller handle normally
  }
}
