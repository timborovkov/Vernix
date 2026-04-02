import { createHmac, timingSafeEqual } from "crypto";
import type { EmailPreferences } from "@/lib/db/schema";

type EmailCategory = "marketing" | "product" | "transactional";

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return secret;
}

/**
 * Check if an email should be sent based on the user's preferences.
 * Transactional emails are always sent. Marketing and product emails
 * default to opted-in (undefined = true).
 */
export function shouldSendEmail(
  emailPreferences: EmailPreferences | null | undefined,
  category: EmailCategory
): boolean {
  if (category === "transactional") return true;
  const prefs = emailPreferences ?? {};
  return prefs[category] !== false;
}

/**
 * Generate an HMAC-based unsubscribe token. Stateless — no DB lookup needed.
 */
export function generateUnsubscribeToken(
  userId: string,
  category: string
): string {
  return createHmac("sha256", getSecret())
    .update(`${userId}:${category}`)
    .digest("hex");
}

/**
 * Verify an unsubscribe token matches the expected userId + category.
 */
export function verifyUnsubscribeToken(
  token: string,
  userId: string,
  category: string
): boolean {
  const expected = generateUnsubscribeToken(userId, category);
  if (token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

/**
 * Build a full unsubscribe URL for email footers.
 */
export function buildUnsubscribeUrl(
  userId: string,
  category: EmailCategory
): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://vernix.app";
  const token = generateUnsubscribeToken(userId, category);
  return `${appUrl}/api/email/unsubscribe?userId=${userId}&category=${category}&token=${token}`;
}
