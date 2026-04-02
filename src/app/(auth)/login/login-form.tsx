"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SsoButtons } from "@/components/auth/sso-buttons";
import { trackLogin } from "@/lib/analytics";

interface LoginFormProps {
  enableGoogle: boolean;
  enableGithub: boolean;
}

export function LoginForm({ enableGoogle, enableGithub }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(
    searchParams.get("error") === "AccountExists"
      ? "An account with this email already exists. Sign in with your email and password, then link the provider from settings."
      : ""
  );
  const [loading, setLoading] = useState(false);

  const hasSso = enableGoogle || enableGithub;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        trackLogin("credentials");
        router.push("/dashboard");
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
      <h1 className="mb-1 text-2xl font-bold">Welcome back</h1>
      <p className="text-muted-foreground mb-8 text-sm">
        Sign in to your Vernix account.
      </p>

      {hasSso && (
        <>
          <SsoButtons enableGoogle={enableGoogle} enableGithub={enableGithub} />
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        No account?{" "}
        <Link href="/register" className="text-foreground underline">
          Sign up free
        </Link>
      </p>
    </div>
  );
}
