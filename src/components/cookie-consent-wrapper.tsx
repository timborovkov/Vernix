"use client";

import dynamic from "next/dynamic";

const CookieConsentBanner = dynamic(
  () =>
    import("@/components/cookie-consent-banner").then(
      (mod) => mod.CookieConsentBanner
    ),
  { ssr: false }
);

export function CookieConsentWrapper({
  analyticsEnabled,
}: {
  analyticsEnabled: boolean;
}) {
  return <CookieConsentBanner analyticsEnabled={analyticsEnabled} />;
}
