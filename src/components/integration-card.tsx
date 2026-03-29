"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Check,
  Clock,
  ChevronDown,
  ExternalLink,
  FlaskConical,
} from "lucide-react";
import { toast } from "sonner";
import type { Integration } from "@/lib/integrations/catalog";

interface IntegrationCardProps {
  integration: Integration;
  connected: boolean;
  serverId?: string;
  onConnect: (integration: Integration) => void;
  onDisconnect: (integration: Integration) => void;
  onTest?: (id: string) => Promise<{
    success: boolean;
    toolCount?: number;
    error?: string;
  }>;
}

export function IntegrationCard({
  integration,
  connected,
  serverId,
  onConnect,
  onDisconnect,
  onTest,
}: IntegrationCardProps) {
  const isComingSoon = integration.status === "coming-soon";
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [testing, setTesting] = useState(false);

  return (
    <>
      <Card
        className={`transition-colors ${connected ? "border-ring/30" : ""}`}
      >
        <CardContent className="p-0">
          {/* Main row: logo, name/description, connect button, chevron */}
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
              onClick={() => setExpanded(!expanded)}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                <Image
                  src={integration.logo}
                  alt={integration.name}
                  width={20}
                  height={20}
                  className="opacity-80"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{integration.name}</p>
                  {connected && (
                    <Badge
                      variant="secondary"
                      className="bg-green-500/10 text-green-600"
                    >
                      <Check className="mr-0.5 h-3 w-3" />
                      Connected
                    </Badge>
                  )}
                  {isComingSoon && (
                    <Badge variant="outline">
                      <Clock className="mr-0.5 h-3 w-3" />
                      Soon
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground mt-0.5 truncate text-xs">
                  {integration.description}
                </p>
              </div>
            </button>

            {/* Connect button — always visible */}
            <div className="shrink-0">
              {connected ? (
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => setConfirmDisconnect(true)}
                >
                  Disconnect
                </Button>
              ) : (
                <Button
                  size="xs"
                  variant={isComingSoon ? "outline" : "default"}
                  disabled={isComingSoon}
                  onClick={() => onConnect(integration)}
                >
                  {isComingSoon ? "Soon" : "Connect"}
                </Button>
              )}
            </div>

            {/* Chevron */}
            <button
              type="button"
              className="text-muted-foreground shrink-0"
              onClick={() => setExpanded(!expanded)}
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          {/* Expanded details */}
          {expanded && (
            <div className="border-t px-4 pt-3 pb-3">
              {integration.examplePrompts.length > 0 && (
                <div className="mb-2">
                  <p className="text-muted-foreground mb-1 text-[11px] font-medium tracking-wide uppercase">
                    Example prompts
                  </p>
                  <div className="space-y-0.5">
                    {integration.examplePrompts.map((prompt) => (
                      <p
                        key={prompt}
                        className="text-muted-foreground text-xs italic"
                      >
                        &quot;{prompt}&quot;
                      </p>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {connected && serverId && onTest && (
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={testing}
                    onClick={async () => {
                      setTesting(true);
                      try {
                        const result = await onTest(serverId);
                        if (result.success) {
                          toast.success(
                            `Connected — ${result.toolCount} tools available`
                          );
                        } else {
                          toast.error(result.error ?? "Connection failed");
                        }
                      } catch {
                        toast.error("Connection test failed");
                      } finally {
                        setTesting(false);
                      }
                    }}
                  >
                    <FlaskConical className="mr-1 h-3 w-3" />
                    {testing ? "Testing..." : "Test"}
                  </Button>
                )}
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() =>
                    window.open(integration.docsUrl, "_blank", "noopener")
                  }
                >
                  <ExternalLink className="mr-1 h-3 w-3" />
                  Docs
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={confirmDisconnect}
        onOpenChange={setConfirmDisconnect}
        title={`Disconnect ${integration.name}?`}
        description="The agent will no longer have access to this integration during calls."
        confirmLabel="Disconnect"
        onConfirm={() => {
          setConfirmDisconnect(false);
          onDisconnect(integration);
        }}
      />
    </>
  );
}
