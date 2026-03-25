"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type ConsentChoice = "accepted" | "rejected";

const CONSENT_STORAGE_KEY = "vernix_cookie_consent_v1";
const CONSENT_COOKIE_NAME = "vernix_cookie_consent";

export const OPEN_PREFERENCES_EVENT = "vernix:open-cookie-preferences";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function updateConsentMode(choice: ConsentChoice, retries = 10) {
  if (typeof window.gtag !== "function") {
    if (retries > 0) {
      setTimeout(() => updateConsentMode(choice, retries - 1), 100);
    }
    return;
  }

  const analyticsStorage = choice === "accepted" ? "granted" : "denied";

  window.gtag("consent", "update", {
    analytics_storage: analyticsStorage,
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}

const consentListeners = new Set<() => void>();

function persistConsent(choice: ConsentChoice) {
  localStorage.setItem(CONSENT_STORAGE_KEY, choice);

  const maxAgeSeconds = 60 * 60 * 24 * 180;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE_NAME}=${choice}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;

  consentListeners.forEach((listener) => listener());
}

function subscribeConsent(listener: () => void) {
  consentListeners.add(listener);
  return () => {
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    consentListeners.delete(listener);
  };
}

function getConsentSnapshot(): ConsentChoice | null {
  const value = localStorage.getItem(CONSENT_STORAGE_KEY);
  return value === "accepted" || value === "rejected" ? value : null;
}

function getConsentServerSnapshot(): ConsentChoice | null {
  return null;
}

type CookieConsentBannerProps = {
  analyticsEnabled: boolean;
};

export function CookieConsentBanner({
  analyticsEnabled,
}: CookieConsentBannerProps) {
  const consentChoice = useSyncExternalStore(
    subscribeConsent,
    getConsentSnapshot,
    getConsentServerSnapshot
  );
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  useEffect(() => {
    if (analyticsEnabled && consentChoice) {
      updateConsentMode(consentChoice);
    }
  }, [analyticsEnabled, consentChoice]);

  useEffect(() => {
    const openPreferences = () => setIsPreferencesOpen(true);

    window.addEventListener(OPEN_PREFERENCES_EVENT, openPreferences);

    return () => {
      window.removeEventListener(OPEN_PREFERENCES_EVENT, openPreferences);
    };
  }, []);

  const handleConsent = useCallback((choice: ConsentChoice) => {
    persistConsent(choice);
    setIsPreferencesOpen(false);
  }, []);

  const isVisible =
    analyticsEnabled && (consentChoice === null || isPreferencesOpen);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="border-border bg-background/95 fixed inset-x-4 bottom-4 z-50 rounded-xl border p-4 shadow-xl backdrop-blur md:inset-x-auto md:right-4 md:w-[560px]">
      <p className="text-sm font-medium">We respect your privacy.</p>
      <p className="text-muted-foreground mt-1 text-sm">
        We use essential cookies to run Vernix and optional analytics cookies to
        improve the product. You can change your choice at any time from the
        footer.
      </p>
      <p className="mt-2 text-sm">
        <Link href="/cookie-policy" className="underline underline-offset-2">
          Read Cookie Policy
        </Link>
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleConsent("rejected")}
        >
          Reject all
        </Button>
        <Button
          variant="accent"
          size="sm"
          onClick={() => handleConsent("accepted")}
        >
          Accept all
        </Button>
      </div>
    </div>
  );
}
