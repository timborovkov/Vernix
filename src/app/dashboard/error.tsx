"use client";

import Link from "next/link";
import { ErrorContent } from "@/components/error-content";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center">
      <ErrorContent error={error} reset={reset}>
        <Button variant="outline" render={<Link href="/dashboard" />}>
          Back to dashboard
        </Button>
      </ErrorContent>
    </div>
  );
}
