"use client";

import * as Sentry from "@sentry/nextjs";
import { TriangleAlert } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function ErrorContent({
  error,
  reset,
  children,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  children?: ReactNode;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <>
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
      <div className="flex gap-3">
        {children}
        <Button onClick={reset}>Try again</Button>
      </div>
    </>
  );
}
