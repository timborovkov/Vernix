/**
 * Build checkout URL with customer identity params.
 * All checkout links MUST use this to ensure Polar can link the subscription
 * back to the user via webhook (customerExternalId).
 */
export function getCheckoutUrl(options?: {
  userId?: string;
  email?: string;
  productId?: string;
}): string {
  const product =
    options?.productId ?? process.env.NEXT_PUBLIC_POLAR_PRODUCT_ID_PRO_MONTHLY;

  if (!product) return "/pricing";

  const params = new URLSearchParams({ products: product });
  if (options?.userId) params.set("customerExternalId", options.userId);
  if (options?.email) params.set("customerEmail", options.email);

  return `/api/checkout?${params.toString()}`;
}
