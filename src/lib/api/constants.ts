// ---------------------------------------------------------------------------
// Public API rate limit & versioning constants
// ---------------------------------------------------------------------------

/** Current API version */
export const API_VERSION = "v1";

/** Standard rate limit: requests per minute for normal endpoints */
export const RATE_LIMIT_STANDARD = 60;

/** Expensive rate limit: requests per minute for costly operations */
export const RATE_LIMIT_EXPENSIVE = 10;

/** Rate limit window in milliseconds (1 minute) */
export const RATE_LIMIT_WINDOW_MS = 60_000;
