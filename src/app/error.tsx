"use client";

import { ErrorContent } from "@/components/error-content";
import { VernixLogo } from "@/components/ui/vernix-logo";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <VernixLogo size={48} className="mb-8" />
      <div className="flex flex-col items-center text-center">
        <ErrorContent error={error} reset={reset} />
      </div>
    </div>
  );
}
