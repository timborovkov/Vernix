"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail } from "lucide-react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong");
        return;
      }

      setSent(true);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="w-full max-w-sm text-center">
        <Mail className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
        <h1 className="mb-2 text-2xl font-bold">Check your email</h1>
        <p className="text-muted-foreground mb-6 text-sm">
          If an account exists for {email}, we sent a password reset link. Check
          your inbox and spam folder.
        </p>
        <Link
          href="/login"
          className="text-muted-foreground hover:text-foreground text-sm underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <Link
        href="/login"
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to sign in
      </Link>
      <h1 className="mb-1 text-2xl font-bold">Forgot your password?</h1>
      <p className="text-muted-foreground mb-8 text-sm">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-destructive text-center text-sm">{error}</p>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <Button
          type="submit"
          variant="accent"
          className="w-full"
          disabled={loading}
        >
          {loading ? "Sending..." : "Send reset link"}
        </Button>
      </form>
    </div>
  );
}
