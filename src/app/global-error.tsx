"use client";

import * as Sentry from "@sentry/nextjs";
import { TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { ThemeScript } from "@/components/theme-script";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-dvh flex-col items-center justify-center bg-white px-4 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
            <TriangleAlert className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="mb-2 text-lg font-medium">Something went wrong</h1>
          <p className="mb-6 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
            A critical error occurred. Please reload the page.
          </p>
          {error.digest && (
            <p className="mb-4 font-mono text-xs text-zinc-400 dark:text-zinc-500">
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Reload page
          </button>
        </div>
      </body>
    </html>
  );
}
