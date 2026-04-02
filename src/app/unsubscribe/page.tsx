"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const category = searchParams.get("category");

  const isSuccess = status === "success";

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-foreground mb-4 text-2xl font-semibold">
          {isSuccess ? "Unsubscribed" : "Something went wrong"}
        </h1>
        <p className="text-muted-foreground mb-6 text-sm">
          {isSuccess
            ? `You've been unsubscribed from ${category ?? "these"} emails. You can re-enable them in your account settings.`
            : "The unsubscribe link is invalid or has expired. You can manage email preferences in your account settings."}
        </p>
        <Link
          href="/dashboard/settings"
          className="text-foreground text-sm font-medium underline underline-offset-4 hover:no-underline"
        >
          Go to Settings
        </Link>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense>
      <UnsubscribeContent />
    </Suspense>
  );
}
