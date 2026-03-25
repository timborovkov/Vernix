import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { QueryProvider } from "@/components/query-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vernix — AI Video Call Agent",
  description:
    "AI-powered meeting assistant that joins your video calls, transcribes conversations, and answers questions using context from current and past meetings.",
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
    title: "Vernix — AI Video Call Agent",
    description:
      "AI-powered meeting assistant that joins your video calls, transcribes conversations, and answers questions.",
    images: [
      { url: "/brand/og/og-with-subtitle.png", width: 1200, height: 630 },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vernix — AI Video Call Agent",
    description:
      "AI-powered meeting assistant that joins your video calls, transcribes conversations, and answers questions.",
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
      <body className="flex min-h-full flex-col">
        <SessionProvider>
          <QueryProvider>
            {children}
            <Toaster richColors position="bottom-right" />
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
