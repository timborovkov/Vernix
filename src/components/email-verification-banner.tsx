"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

export function EmailVerificationBanner() {
  const { data: session, update: updateSession } = useSession();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);

  // After verify-email redirect (?verified=1), refresh the JWT so emailVerifiedAt is populated
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "1") {
      updateSession();
    }
  }, [updateSession]);

  if (!session?.user || session.user.emailVerifiedAt || dismissed) {
    return null;
  }

  async function handleResend() {
    setSending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Verification email sent — check your inbox");
      } else {
        const data = await res.json();
        toast.error(data.error ?? "Failed to send verification email");
      }
    } catch {
      toast.error("Failed to send verification email");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-muted border-border border-b px-4 py-2.5 text-center text-sm">
      <span className="text-muted-foreground">
        Please verify your email address.{" "}
      </span>
      <button
        onClick={handleResend}
        disabled={sending}
        className="text-foreground font-medium underline underline-offset-4 hover:no-underline disabled:opacity-50"
      >
        {sending ? "Sending…" : "Resend verification email"}
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="text-muted-foreground hover:text-foreground ml-3"
        aria-label="Dismiss"
      >
        &times;
      </button>
    </div>
  );
}
