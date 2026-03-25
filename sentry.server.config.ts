// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const sentryEnabled = process.env.NEXT_PUBLIC_SENTRY_ENABLED === "true";
const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const isSentryConfigured = sentryEnabled && Boolean(sentryDsn);

Sentry.init({
  enabled: isSentryConfigured,
  dsn: sentryDsn,

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});
