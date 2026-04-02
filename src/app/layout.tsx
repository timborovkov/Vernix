import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import Script from "next/script";
import { Toaster } from "sonner";
import { CookieConsentWrapper } from "@/components/cookie-consent-wrapper";
import { QueryProvider } from "@/components/query-provider";
import { ThemeScript } from "@/components/theme-script";
import "./globals.css";

const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const contentsquareTag = process.env.NEXT_PUBLIC_CONTENTSQUARE_TAG;
const isAnalyticsEnabled =
  Boolean(gaMeasurementId) || Boolean(contentsquareTag);

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const disableIndexing = process.env.NEXT_PUBLIC_DISABLE_INDEXING === "true";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  title: "Vernix — AI Assistant for Video Calls | Live Data from Your Tools",
  description:
    "An AI agent that joins Zoom, Meet, Teams, and Webex. Connects to Slack, Linear, GitHub. Answers questions with live data during calls. Free to start.",
  ...(disableIndexing && { robots: { index: false, follow: false } }),
  icons: {
    icon: [
      {
        url: "/brand/favicon/favicon-32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/brand/favicon/favicon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      { url: "/brand/favicon/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/brand/favicon/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "Vernix — AI Assistant for Video Calls",
    description:
      "Connects to your tools. Answers questions with live data during calls. Transcripts, summaries, and action items included.",
    images: [
      { url: "/brand/og/og-with-subtitle.png", width: 1200, height: 630 },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vernix — AI Assistant for Video Calls",
    description:
      "Connects to your tools. Answers questions with live data during calls. Transcripts, summaries, and action items included.",
    images: ["/brand/og/og-with-subtitle.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta
          name="theme-color"
          content="#ffffff"
          media="(prefers-color-scheme: light)"
        />
        <meta
          name="theme-color"
          content="#242424"
          media="(prefers-color-scheme: dark)"
        />
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col">
        <SessionProvider>
          <QueryProvider>
            {children}
            <Toaster richColors position="bottom-right" />
            <CookieConsentWrapper analyticsEnabled={isAnalyticsEnabled} />
          </QueryProvider>
        </SessionProvider>
        {gaMeasurementId ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
              strategy="afterInteractive"
            />
            <Script
              id="google-analytics-consent-v2"
              strategy="afterInteractive"
            >
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){window.dataLayer.push(arguments);}
                window.gtag = gtag;
                gtag('consent', 'default', {
                  analytics_storage: 'denied',
                  ad_storage: 'denied',
                  ad_user_data: 'denied',
                  ad_personalization: 'denied',
                  wait_for_update: 500
                });
                gtag('set', 'ads_data_redaction', true);
                gtag('set', 'url_passthrough', true);
                gtag('js', new Date());
                gtag('config', '${gaMeasurementId}', {
                  anonymize_ip: true
                });
              `}
            </Script>
          </>
        ) : null}
      </body>
    </html>
  );
}
