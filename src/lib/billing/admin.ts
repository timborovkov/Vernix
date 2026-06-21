import { getEnv } from "@/lib/env";

export function parseAdminEmailAllowlist(value?: string | null): Set<string> {
  if (!value) return new Set();

  return new Set(
    value
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isAdminUserEmail(
  email: string | null | undefined,
  allowlist: string | null | undefined = getEnv().ADMIN_USER_EMAILS
): boolean {
  if (!email) return false;
  return parseAdminEmailAllowlist(allowlist).has(email.trim().toLowerCase());
}
