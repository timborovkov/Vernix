"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useApiKeys } from "@/hooks/use-api-keys";
import { useMcpServers } from "@/hooks/use-mcp-servers";
import { useProfile } from "@/hooks/use-profile";
import { ApiKeyList } from "@/components/api-key-list";
import { McpServerList } from "@/components/mcp-server-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, User, Link2, Lock } from "lucide-react";

interface SettingsFormProps {
  enableGoogle: boolean;
  enableGithub: boolean;
}

export function SettingsForm({
  enableGoogle,
  enableGithub,
}: SettingsFormProps) {
  const { keys, createKey, deleteKey } = useApiKeys();
  const { servers, addServer, toggleServer, deleteServer } = useMcpServers();
  const {
    profile,
    loading: profileLoading,
    updateName,
    updatingName,
    changePassword,
    changingPassword,
    unlinkAccount,
    unlinkingAccount,
  } = useProfile();

  const [editName, setEditName] = useState("");
  const [nameEditing, setNameEditing] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

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
            <div>
              <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                Server URL
              </p>
              <code className="bg-muted text-foreground block rounded px-3 py-2 text-sm break-all">
                {`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/mcp`}
              </code>
            </div>
            <ApiKeyList keys={keys} onCreate={createKey} onDelete={deleteKey} />
          </CardContent>
        </Card>

        {/* External MCP Servers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">External MCP Servers</CardTitle>
            <p className="text-muted-foreground text-sm">
              Connect external MCP servers to give the AI agent access to
              additional tools.
            </p>
          </CardHeader>
          <CardContent>
            <McpServerList
              servers={servers}
              onAdd={addServer}
              onToggle={toggleServer}
              onDelete={deleteServer}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
