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

interface IntegrationConnectDialogProps {
  integration: Integration | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (name: string, url: string, apiKey?: string) => Promise<void>;
}

export function IntegrationConnectDialog({
  integration,
  open,
  onOpenChange,
  onConnect,
}: IntegrationConnectDialogProps) {
  const [serverUrl, setServerUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setServerUrl(integration?.serverUrl ?? "");
    setApiKey("");
    setLoading(false);
  }, [integration?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!integration) return null;

  const authLabel =
    integration.authMode === "api_key"
      ? "API Key"
      : integration.authMode === "token"
        ? "Access Token"
        : "Credentials";

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverUrl) {
      toast.error("Server URL is required");
      return;
    }

    setLoading(true);
    try {
      await onConnect(integration.name, serverUrl, apiKey || undefined);
      onOpenChange(false);
      setServerUrl("");
      setApiKey("");
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

        <form onSubmit={handleConnect} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="server-url">MCP Server URL</Label>
            <Input
              id="server-url"
              type="url"
              placeholder={integration.serverUrl ?? "https://mcp.example.com"}
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              required
            />
          </div>

          {integration.authMode !== "none" && (
            <div className="space-y-2">
              <Label htmlFor="api-key">{authLabel}</Label>
              <Input
                id="api-key"
                type="password"
                placeholder={`Paste your ${authLabel.toLowerCase()}`}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
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
      </DialogContent>
    </Dialog>
  );
}
