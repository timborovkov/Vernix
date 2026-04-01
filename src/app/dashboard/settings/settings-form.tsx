"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useApiKeys } from "@/hooks/use-api-keys";
import { useProfile } from "@/hooks/use-profile";
import { useBilling } from "@/hooks/use-billing";
import { ApiKeyList } from "@/components/api-key-list";
import { BillingCard } from "@/components/billing-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, User, Link2, Lock, Globe } from "lucide-react";
import { getCheckoutUrl } from "@/lib/billing/checkout-url";

interface SettingsFormProps {
  enableGoogle: boolean;
  enableGithub: boolean;
}

export function SettingsForm({
  enableGoogle,
  enableGithub,
}: SettingsFormProps) {
  const { keys, createKey, deleteKey } = useApiKeys();
  const { billing, loading: billingLoading } = useBilling();
  const {
    profile,
    loading: profileLoading,
    updateName,
    updatingName,
    changePassword,
    changingPassword,
    updateTimezone,
    updatingTimezone,
    unlinkAccount,
    unlinkingAccount,
  } = useProfile();

  const [editName, setEditName] = useState("");
  const [nameEditing, setNameEditing] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [tzSearch, setTzSearch] = useState("");

  const browserTz =
    typeof window !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC";
  const allTimezones = useMemo(
    () =>
      typeof Intl.supportedValuesOf === "function"
        ? Intl.supportedValuesOf("timeZone")
        : [browserTz],
    [browserTz]
  );
  const filteredTimezones = useMemo(
    () =>
      tzSearch
        ? allTimezones.filter((tz) =>
            tz.toLowerCase().includes(tzSearch.toLowerCase())
          )
        : allTimezones,
    [tzSearch, allTimezones]
  );

  const handleNameSave = async () => {
    try {
      await updateName(editName);
      setNameEditing(false);
    } catch {
      // Error handled by toast in hook
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await changePassword({
        currentPassword: profile?.hasPassword ? currentPassword : undefined,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
    } catch {
      // Error handled by toast in hook — fields kept for retry
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center gap-3">
        <Button variant="ghost" size="sm" render={<Link href="/dashboard" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm">
            Manage your profile, connections, and API keys
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-4 w-4" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profileLoading ? (
              <div className="space-y-3">
                <div className="bg-muted h-8 w-48 animate-pulse rounded-md" />
                <div className="bg-muted h-4 w-64 animate-pulse rounded-md" />
              </div>
            ) : profile ? (
              <>
                <div className="flex items-center gap-4">
                  {profile.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.image}
                      alt=""
                      className="h-12 w-12 rounded-full"
                    />
                  ) : (
                    <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold">
                      {profile.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    {nameEditing ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="max-w-xs"
                        />
                        <Button
                          size="sm"
                          onClick={handleNameSave}
                          disabled={updatingName}
                        >
                          {updatingName ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setNameEditing(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{profile.name}</p>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => {
                            setEditName(profile.name);
                            setNameEditing(true);
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    )}
                    <p className="text-muted-foreground text-sm">
                      {profile.email}
                    </p>
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        {/* Billing */}
        <BillingCard billing={billing} loading={billingLoading} />

        {/* Connected Accounts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Link2 className="h-4 w-4" />
              Connected Accounts
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Link additional sign-in methods to your account.
            </p>
          </CardHeader>
          <CardContent>
            {profile ? (
              <div className="space-y-3">
                {/* Google */}
                {enableGoogle &&
                  (profile.accounts.find((a) => a.provider === "google") ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">Google</span>
                        <span className="text-muted-foreground">Connected</span>
                      </div>
                      <Button
                        size="xs"
                        variant="ghost"
                        disabled={unlinkingAccount}
                        onClick={() => unlinkAccount("google")}
                      >
                        Unlink
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Google</span>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() =>
                          signIn("google", {
                            callbackUrl: "/dashboard/settings",
                          })
                        }
                      >
                        Connect
                      </Button>
                    </div>
                  ))}

                {/* GitHub */}
                {enableGithub &&
                  (profile.accounts.find((a) => a.provider === "github") ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">GitHub</span>
                        <span className="text-muted-foreground">Connected</span>
                      </div>
                      <Button
                        size="xs"
                        variant="ghost"
                        disabled={unlinkingAccount}
                        onClick={() => unlinkAccount("github")}
                      >
                        Unlink
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">GitHub</span>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() =>
                          signIn("github", {
                            callbackUrl: "/dashboard/settings",
                          })
                        }
                      >
                        Connect
                      </Button>
                    </div>
                  ))}

                {profile.hasPassword && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">Email & Password</span>
                      <span className="text-muted-foreground">
                        {profile.email}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-muted h-20 animate-pulse rounded-md" />
            )}
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="h-4 w-4" />
              {profile?.hasPassword ? "Change Password" : "Set Password"}
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              {profile?.hasPassword
                ? "Update your password."
                : "Add a password to enable email sign-in."}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              {profile?.hasPassword && (
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>
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
              <Button type="submit" size="sm" disabled={changingPassword}>
                {changingPassword
                  ? "Saving..."
                  : profile?.hasPassword
                    ? "Change password"
                    : "Set password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* MCP Server Access */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">MCP Server Access</CardTitle>
            <p className="text-muted-foreground text-sm">
              Generate API keys to connect from Claude Desktop, Cursor, or other
              MCP clients.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {billing && !billing.limits.apiEnabled ? (
              <div className="space-y-3 py-2">
                <p className="text-muted-foreground text-sm">
                  Access your calls, transcripts, and search from Claude
                  Desktop, Cursor, or any MCP client. Ask questions about your
                  calls from your favorite AI tools.
                </p>
                <Button
                  size="sm"
                  variant="accent"
                  onClick={() => {
                    window.location.href = getCheckoutUrl();
                  }}
                >
                  Upgrade to Pro for API access
                </Button>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                    Server URL
                  </p>
                  <code className="bg-muted text-foreground block rounded px-3 py-2 text-sm break-all">
                    {`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/mcp`}
                  </code>
                </div>
                <ApiKeyList
                  keys={keys}
                  onCreate={createKey}
                  onDelete={deleteKey}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Integrations link */}
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium">Integrations</p>
              <p className="text-muted-foreground text-xs">
                Connect Slack, Linear, GitHub, and more to your calls.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              render={<Link href="/dashboard/integrations" />}
            >
              Manage
            </Button>
          </CardContent>
        </Card>

        {/* Timezone */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-4 w-4" />
              Timezone
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              All dates and times across Vernix will use this timezone.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={!profile?.timezone ? "accent" : "outline"}
                  disabled={updatingTimezone}
                  onClick={() => updateTimezone(null)}
                >
                  Auto ({browserTz})
                </Button>
                {profile?.timezone && (
                  <span className="text-muted-foreground text-sm">
                    Current:{" "}
                    <span className="text-foreground font-medium">
                      {profile.timezone}
                    </span>
                  </span>
                )}
              </div>
              <Input
                placeholder="Search timezones..."
                value={tzSearch}
                onChange={(e) => setTzSearch(e.target.value)}
                className="max-w-xs"
              />
              <div className="border-border max-h-48 max-w-xs overflow-y-auto rounded-md border">
                {filteredTimezones.slice(0, 100).map((tz) => (
                  <button
                    key={tz}
                    type="button"
                    className={`hover:bg-muted w-full px-3 py-1.5 text-left text-sm transition-colors ${
                      profile?.timezone === tz
                        ? "bg-ring/10 text-foreground font-medium"
                        : "text-muted-foreground"
                    }`}
                    onClick={() => updateTimezone(tz)}
                    disabled={updatingTimezone}
                  >
                    {tz}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
