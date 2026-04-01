"use client";

import * as Sentry from "@sentry/nextjs";
import { TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { VernixLogo } from "@/components/ui/vernix-logo";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <VernixLogo size={48} className="mb-8" />
      <div className="flex flex-col items-center text-center">
        <div className="bg-destructive/10 mb-4 flex h-16 w-16 items-center justify-center rounded-full">
          <TriangleAlert className="text-destructive h-8 w-8" />
        </div>
        <h1 className="mb-2 text-lg font-medium">Something went wrong</h1>
        <p className="text-muted-foreground mb-6 max-w-sm text-sm">
          An unexpected error occurred. Please try again.
        </p>
        {error.digest && (
          <p className="text-muted-foreground mb-4 font-mono text-xs">
            Error ID: {error.digest}
          </p>
        )}
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
