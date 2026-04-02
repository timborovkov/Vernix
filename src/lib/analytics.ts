// ---------------------------------------------------------------------------
// GA4 event tracking utility
// ---------------------------------------------------------------------------
// All events respect GA4 consent mode v2 — no manual consent checks needed.
// When analytics_storage is denied, gtag queues or drops events automatically.
// ---------------------------------------------------------------------------

const UTM_STORAGE_KEY = "vernix_utm_params";

type UtmParams = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
};

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

function trackEvent(name: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined" || typeof window.gtag !== "function")
    return;
  window.gtag("event", name, params);
}

// ---------------------------------------------------------------------------
// UTM capture & retrieval
// ---------------------------------------------------------------------------

/** Read UTM params from URL and persist to sessionStorage. Idempotent. */
export function captureUtmParams() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const keys: (keyof UtmParams)[] = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
  ];
  const params: UtmParams = {};
  let found = false;
  for (const key of keys) {
    const value = url.searchParams.get(key);
    if (value) {
      params[key] = value;
      found = true;
    }
  }
  if (found) {
    sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(params));
  }
}

function getUtmParams(): UtmParams {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(UTM_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UtmParams) : {};
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Funnel events (GA4 recommended names)
// ---------------------------------------------------------------------------

export function trackSignUp(method: "credentials" | "sso") {
  trackEvent("sign_up", { method, ...getUtmParams() });
}

export function trackLogin(method: "credentials") {
  trackEvent("login", { method });
}

export function trackBeginCheckout(interval: "monthly" | "annual") {
  trackEvent("begin_checkout", { interval });
}

export function trackPurchase(plan: string, isTrialing: boolean) {
  trackEvent("purchase", { plan, is_trialing: isTrialing });
}

// ---------------------------------------------------------------------------
// Custom conversion events
// ---------------------------------------------------------------------------

export function trackMeetingCreated(silent: boolean) {
  trackEvent("meeting_created", { silent });
}

export function trackPaywallShown(trigger: string) {
  trackEvent("paywall_shown", { trigger });
}

// ---------------------------------------------------------------------------
// Feature usage events
// ---------------------------------------------------------------------------

export function trackDocumentUploaded(fileType: string) {
  trackEvent("document_uploaded", { file_type: fileType });
}

export function trackIntegrationConnected(name: string) {
  trackEvent("integration_connected", { integration_name: name });
}

export function trackSearchPerformed() {
  trackEvent("search_performed");
}

export function trackChatMessageSent() {
  trackEvent("chat_message_sent");
}

export function trackApiKeyCreated() {
  trackEvent("api_key_created");
}

export function trackTaskCreated() {
  trackEvent("task_created");
}

export function trackMeetingExport(format: "md" | "pdf") {
  trackEvent("meeting_export", { format });
}

export function trackEmailVerified() {
  trackEvent("email_verified");
}

// ---------------------------------------------------------------------------
// Page / CTA events
// ---------------------------------------------------------------------------

export function trackCtaClicked(location: string) {
  trackEvent("cta_clicked", { location });
}

export function trackPricingPageViewed() {
  trackEvent("pricing_page_viewed");
}
