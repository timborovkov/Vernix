"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ExternalLink } from "lucide-react";
import type { Integration } from "@/lib/integrations/catalog";
import type { AddServerParams, McpAuthType } from "@/hooks/use-mcp-servers";
import { trackIntegrationConnected } from "@/lib/analytics";

interface IntegrationConnectDialogProps {
  integration: Integration | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (params: AddServerParams) => Promise<void>;
  onStartOAuth?: (integrationId: string, serverUrl?: string) => Promise<void>;
  oauthLoading?: boolean;
}

const AUTH_OPTIONS: { value: McpAuthType; label: string }[] = [
  { value: "none", label: "No authentication" },
  { value: "bearer", label: "Bearer token" },
  { value: "header", label: "Custom header" },
  { value: "basic", label: "HTTP Basic" },
  { value: "url_key", label: "API key in URL" },
];

export function IntegrationConnectDialog({
  integration,
  open,
  onOpenChange,
  onConnect,
  onStartOAuth,
  oauthLoading,
}: IntegrationConnectDialogProps) {
  const [customName, setCustomName] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [authType, setAuthType] = useState<McpAuthType>("none");
  const [token, setToken] = useState("");
  const [headerName, setHeaderName] = useState("");
  const [headerValue, setHeaderValue] = useState("");
  const [paramName, setParamName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCustomName("");
    setServerUrl(integration?.serverUrl ?? "");
    setAuthType(
      integration?.authMode === "api_key"
        ? "bearer"
        : integration?.authMode === "token"
          ? "bearer"
          : "none"
    );
    setToken("");
    setHeaderName("");
    setHeaderValue("");
    setParamName("");
    setUsername("");
    setPassword("");
    setLoading(false);
  }, [integration?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!integration) return null;

  const isCustom = !integration.serverUrl && integration.id === "custom";
  const hasPrefilledUrl = !!integration.serverUrl;
  const isCatalogOAuth =
    !isCustom && integration.authMode === "oauth" && hasPrefilledUrl;
  const isCatalogToken =
    !isCustom &&
    !isCatalogOAuth &&
    (integration.authMode === "api_key" || integration.authMode === "token");
  const isCatalogUrlKey =
    !isCustom && integration.authMode === "url_key" && hasPrefilledUrl;

  const handleOAuth = async () => {
    if (!onStartOAuth) return;
    try {
      await onStartOAuth(integration.id, integration.serverUrl ?? undefined);
      // Don't close — browser will redirect to OAuth provider
    } catch {
      // Error handled by hook toast
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = hasPrefilledUrl ? integration.serverUrl! : serverUrl;
    if (!url) {
      toast.error("Server URL is required");
      return;
    }

    setLoading(true);
    try {
      const params: AddServerParams = {
        name: isCustom ? customName || serverUrl : integration.name,
        url,
        catalogIntegrationId: isCustom ? undefined : integration.id,
      };

      if (isCustom) {
        params.authType = authType;
        switch (authType) {
          case "bearer":
            params.authHeaderValue = token;
            break;
          case "header":
            params.authHeaderName = headerName;
            params.authHeaderValue = headerValue;
            break;
          case "basic":
            params.authUsername = username;
            params.authPassword = password;
            break;
          case "url_key":
            params.authKeyParam = paramName;
            params.authHeaderValue = token;
            break;
        }
      } else if (isCatalogUrlKey) {
        params.authType = "url_key";
        params.authKeyParam = integration.authKeyParam;
        params.authHeaderValue = token;
      } else if (isCatalogToken) {
        params.authType = "bearer";
        params.authHeaderValue = token;
      }

      await onConnect(params);
      trackIntegrationConnected(integration.name);
      onOpenChange(false);
    } catch {
      // Error handled by hook toast
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect {integration.name}</DialogTitle>
        </DialogHeader>

        <p className="text-muted-foreground text-sm">
          {integration.setupInstructions}
        </p>

        {isCatalogOAuth ? (
          <div className="space-y-4">
            <Button
              className="w-full"
              disabled={oauthLoading}
              onClick={handleOAuth}
            >
              {oauthLoading
                ? "Redirecting..."
                : `Connect with ${integration.name}`}
            </Button>
            <p className="text-muted-foreground text-center text-xs">
              You&apos;ll be redirected to {integration.name} to authorize
              access.
            </p>
          </div>
        ) : (
          <form onSubmit={handleConnect} className="space-y-4">
            {/* Name field: only for custom servers */}
            {isCustom && (
              <div className="space-y-2">
                <Label htmlFor="server-name">Server Name</Label>
                <Input
                  id="server-name"
                  placeholder="My MCP Server"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
              </div>
            )}

            {/* URL field: only for custom servers without prefilled URL */}
            {!hasPrefilledUrl && (
              <div className="space-y-2">
                <Label htmlFor="server-url">MCP Server URL</Label>
                <Input
                  id="server-url"
                  type="url"
                  placeholder="https://mcp.example.com"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Auth type selector: only for custom servers */}
            {isCustom && (
              <div className="space-y-2">
                <Label>Authentication</Label>
                <div className="grid grid-cols-2 gap-2">
                  {AUTH_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                        authType === opt.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                      onClick={() => setAuthType(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Bearer token field */}
            {((isCustom && authType === "bearer") ||
              isCatalogToken ||
              isCatalogUrlKey) && (
              <div className="space-y-2">
                <Label htmlFor="token">
                  {integration.authMode === "api_key" ||
                  integration.authMode === "url_key"
                    ? "API Key"
                    : "Access Token"}
                </Label>
                <Input
                  id="token"
                  type="password"
                  placeholder={`Paste your ${integration.authMode === "api_key" || integration.authMode === "url_key" ? "API key" : "access token"}`}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
              </div>
            )}

            {/* Custom header fields */}
            {isCustom && authType === "header" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="header-name">Header Name</Label>
                  <Input
                    id="header-name"
                    placeholder="X-API-Key"
                    value={headerName}
                    onChange={(e) => setHeaderName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="header-value">Header Value</Label>
                  <Input
                    id="header-value"
                    type="password"
                    placeholder="Paste your key or token"
                    value={headerValue}
                    onChange={(e) => setHeaderValue(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Basic auth fields */}
            {isCustom && authType === "basic" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* URL key fields */}
            {isCustom && authType === "url_key" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="param-name">URL Parameter Name</Label>
                  <Input
                    id="param-name"
                    placeholder="apiKey"
                    value={paramName}
                    onChange={(e) => setParamName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url-key">API Key</Label>
                  <Input
                    id="url-key"
                    type="password"
                    placeholder="Paste your API key"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                  />
                </div>
              </>
            )}

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {loading ? "Connecting..." : "Connect"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() =>
                  window.open(integration.docsUrl, "_blank", "noopener")
                }
              >
                <ExternalLink className="mr-1 h-3 w-3" />
                Setup docs
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
