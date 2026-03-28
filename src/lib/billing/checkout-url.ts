/**
 * Build checkout URL. The server-side checkout route reads the user's identity
 * from the session, so no userId/email params are needed in the URL.
 */
export function getCheckoutUrl(
  interval: "monthly" | "annual" = "monthly"
): string {
  const product =
    interval === "annual"
      ? process.env.NEXT_PUBLIC_POLAR_PRODUCT_ID_PRO_ANNUAL
      : process.env.NEXT_PUBLIC_POLAR_PRODUCT_ID_PRO_MONTHLY;

  if (!product) return "/pricing";

  return `/api/checkout?products=${encodeURIComponent(product)}`;
}
