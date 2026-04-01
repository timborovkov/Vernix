/**
 * Centralized date formatting with timezone support.
 * Uses Intl.DateTimeFormat (zero dependencies, works in browser + Node).
 */

function toDate(date: Date | string): Date {
  return typeof date === "string" ? new Date(date) : date;
}

function format(
  date: Date | string,
  timezone: string | null,
  options: Intl.DateTimeFormatOptions
): string {
  const opts: Intl.DateTimeFormatOptions = { ...options };
  if (timezone) opts.timeZone = timezone;
  try {
    return new Intl.DateTimeFormat(undefined, opts).format(toDate(date));
  } catch {
    // Fall back to no timezone if the stored value is invalid
    return new Intl.DateTimeFormat(undefined, options).format(toDate(date));
  }
}

/** e.g. "Jan 5, 2026, 3:42 PM" */
export function formatDateTime(
  date: Date | string,
  timezone: string | null
): string {
  return format(date, timezone, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** e.g. "Jan 5, 2026" */
export function formatDate(
  date: Date | string,
  timezone: string | null
): string {
  return format(date, timezone, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** e.g. "5m ago", "2h ago", "3d ago" — timezone-independent */
export function formatRelativeTime(date: Date | string): string {
  const d = toDate(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(d, null);
}
