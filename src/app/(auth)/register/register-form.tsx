"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { SsoButtons } from "@/components/auth/sso-buttons";
import { DISPLAY } from "@/lib/billing/constants";
import { trackSignUp } from "@/lib/analytics";

interface RegisterFormProps {
  enableGoogle: boolean;
  enableGithub: boolean;
}

export function RegisterForm({
  enableGoogle,
  enableGithub,
}: RegisterFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const hasSso = enableGoogle || enableGithub;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, termsAccepted }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Registration failed");
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Account created but sign-in failed. Try logging in.");
      } else {
        trackSignUp("credentials");
        router.push("/welcome");
        router.refresh();
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <h1 className="mb-1 text-2xl font-bold">Start using Vernix free</h1>
      <p className="text-muted-foreground mb-8 text-sm">
        {DISPLAY.trialDays}-day Pro trial. No credit card required.
      </p>

      {hasSso && (
        <>
          <SsoButtons
            enableGoogle={enableGoogle}
            enableGithub={enableGithub}
            callbackUrl="/accept-terms"
          />
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="border-border w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background text-muted-foreground px-2">
                or continue with email
              </span>
            </div>
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-destructive text-center text-sm">{error}</p>
        )}
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
        </div>
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
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              className="pr-9"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            required
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
          type="submit"
          variant="accent"
          className="w-full"
          disabled={loading || !termsAccepted}
        >
          {loading ? "Creating account..." : "Create free account"}
        </Button>
      </form>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
