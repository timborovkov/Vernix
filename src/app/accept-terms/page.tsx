"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AcceptTermsPage() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // If terms already accepted, skip to dashboard
  const termsAccepted = session?.user?.termsAcceptedAt;
  useEffect(() => {
    if (termsAccepted) {
      router.replace("/dashboard");
    }
  }, [termsAccepted, router]);

  if (termsAccepted) return null;

  const handleAccept = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/accept-terms", { method: "POST" });
      if (!res.ok) {
        setError("Failed to save. Please try again.");
        return;
      }
      // Refresh JWT with updated termsAcceptedAt from DB
      await updateSession();
      // Hard redirect ensures the browser uses the new JWT cookie
      window.location.href = "/dashboard";
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="mb-8">
        <Image
          src="/brand/combo/horizontal-nobg.png"
          alt="Vernix"
          width={130}
          height={36}
          className="dark:hidden"
        />
        <Image
          src="/brand/combo/horizontal-dark-nobg.png"
          alt="Vernix"
          width={130}
          height={36}
          className="hidden dark:block"
        />
      </div>

      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <h1 className="mb-2 text-xl font-bold">Before you continue</h1>
          <p className="text-muted-foreground mb-6 text-sm">
            Please review and accept our terms to use Vernix.
          </p>

          {error && (
            <p className="text-destructive mb-4 text-center text-sm">{error}</p>
          )}

          <label className="mb-6 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1 shrink-0"
            />
            <span className="text-muted-foreground">
              I agree to the{" "}
              <Link
                href="/terms"
                target="_blank"
                className="text-foreground underline"
              >
                Terms of Use
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                target="_blank"
                className="text-foreground underline"
              >
                Privacy Policy
              </Link>
            </span>
          </label>

          <Button
            className="w-full"
            variant="accent"
            disabled={!accepted || loading}
            onClick={handleAccept}
          >
            {loading ? "Saving..." : "Continue"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
