"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, newPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="w-full max-w-sm text-center">
        <h1 className="mb-2 text-2xl font-bold">Invalid reset link</h1>
        <p className="text-muted-foreground mb-6 text-sm">
          This link is missing or malformed. Please request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="text-muted-foreground hover:text-foreground text-sm underline"
        >
          Request new reset link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="w-full max-w-sm text-center">
        <Check className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
        <h1 className="mb-2 text-2xl font-bold">Password reset</h1>
        <p className="text-muted-foreground mb-6 text-sm">
          Your password has been updated. You can now sign in.
        </p>
        <Button variant="accent" render={<Link href="/login" />}>
          Sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="mb-1 text-2xl font-bold">Set new password</h1>
      <p className="text-muted-foreground mb-8 text-sm">
        Choose a new password for {email || "your account"}.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-destructive text-center text-sm">{error}</p>
        )}
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            placeholder="At least 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input
            id="confirm-password"
            type="password"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>
        <Button
          type="submit"
          variant="accent"
          className="w-full"
          disabled={loading}
        >
          {loading ? "Resetting..." : "Reset password"}
        </Button>
      </form>
    </div>
  );
}
