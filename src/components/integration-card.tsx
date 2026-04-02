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
  Trash2,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import type { Integration } from "@/lib/integrations/catalog";

interface ConnectionInfo {
  id: string;
  name: string;
  enabled: boolean;
  disabledTools: string[] | null;
  cachedTools: { name: string; description: string }[] | null;
}

interface ToolInfo {
  name: string;
  description: string;
  enabled: boolean;
}

interface IntegrationCardProps {
  integration: Integration;
  connections: ConnectionInfo[];
  onConnect: (integration: Integration) => void;
  onDisconnect: (serverId: string) => void;
  onTest?: (id: string) => Promise<{
    success: boolean;
    toolCount?: number;
    error?: string;
  }>;
  onFetchTools?: (serverId: string) => Promise<{
    tools: ToolInfo[];
    cachedAt: string | null;
    stale?: boolean;
  }>;
  onToggleTool?: (serverId: string, toolName: string, enabled: boolean) => void;
}

export function IntegrationCard({
  integration,
  connections,
  onConnect,
  onDisconnect,
  onTest,
  onFetchTools,
  onToggleTool,
}: IntegrationCardProps) {
  const isComingSoon = integration.status === "coming-soon";
  const connected = connections.length > 0;
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [toolsById, setToolsById] = useState<Record<string, ToolInfo[]>>({});
  const [loadingTools, setLoadingTools] = useState<string | null>(null);

  const handleFetchTools = async (serverId: string) => {
    if (!onFetchTools || toolsById[serverId] || loadingTools === serverId)
      return;
    setLoadingTools(serverId);
    try {
      const result = await onFetchTools(serverId);
      setToolsById((prev) => ({ ...prev, [serverId]: result.tools }));
    } catch {
      toast.error("Failed to load tools");
    } finally {
      setLoadingTools(null);
    }
  };

  const getToolsForConnection = (conn: ConnectionInfo): ToolInfo[] | null => {
    // Use fetched tools for names/descriptions, but always derive enabled
    // from the latest conn.disabledTools (from query cache) to stay in sync
    const disabledSet = new Set(conn.disabledTools ?? []);
    const baseTools = toolsById[conn.id] ?? conn.cachedTools;
    if (!baseTools) return null;
    return baseTools.map((t) => ({
      name: t.name,
      description: t.description,
      enabled: !disabledSet.has(t.name),
    }));
  };

  return (
    <>
      <Card
        className={`transition-colors ${connected ? "border-ring/30" : ""}`}
      >
        <CardContent className="p-0">
          {/* Main row */}
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
                      {connections.length === 1
                        ? "Connected"
                        : `${connections.length} connected`}
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

            <div className="shrink-0">
              <Button
                size="xs"
                variant={isComingSoon ? "outline" : "default"}
                disabled={isComingSoon}
                onClick={() => onConnect(integration)}
              >
                {isComingSoon ? "Soon" : connected ? "Add another" : "Connect"}
              </Button>
            </div>

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
              {/* Connected instances */}
              {connections.length > 0 && (
                <div className="mb-3 space-y-2">
                  <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                    Connections
                  </p>
                  {connections.map((conn) => {
                    const tools = getToolsForConnection(conn);
                    return (
                      <div key={conn.id} className="rounded-md border">
                        <div className="flex items-center gap-2 px-3 py-2">
                          <span className="min-w-0 flex-1 truncate text-xs font-medium">
                            {conn.name}
                          </span>
                          {!conn.enabled && (
                            <Badge variant="outline" className="text-[10px]">
                              Disabled
                            </Badge>
                          )}
                          {onFetchTools && !tools && (
                            <Button
                              size="xs"
                              variant="outline"
                              disabled={loadingTools === conn.id}
                              onClick={() => handleFetchTools(conn.id)}
                            >
                              <Wrench className="mr-1 h-3 w-3" />
                              {loadingTools === conn.id
                                ? "Loading..."
                                : "Tools"}
                            </Button>
                          )}
                          {tools && (
                            <Badge variant="outline" className="text-[10px]">
                              <Wrench className="mr-0.5 h-3 w-3" />
                              {tools.filter((t) => t.enabled).length}/
                              {tools.length} tools
                            </Badge>
                          )}
                          {onTest && (
                            <Button
                              size="xs"
                              variant="outline"
                              disabled={testing === conn.id}
                              onClick={async () => {
                                setTesting(conn.id);
                                try {
                                  const result = await onTest(conn.id);
                                  if (result.success) {
                                    toast.success(
                                      `Connected — ${result.toolCount} tools available`
                                    );
                                    // Refresh tools after test (separate error handling)
                                    if (onFetchTools) {
                                      onFetchTools(conn.id)
                                        .then((fresh) =>
                                          setToolsById((prev) => ({
                                            ...prev,
                                            [conn.id]: fresh.tools,
                                          }))
                                        )
                                        .catch(() => {});
                                    }
                                  } else {
                                    toast.error(
                                      result.error ?? "Connection failed"
                                    );
                                  }
                                } catch {
                                  toast.error("Connection test failed");
                                } finally {
                                  setTesting(null);
                                }
                              }}
                            >
                              <FlaskConical className="mr-1 h-3 w-3" />
                              {testing === conn.id ? "Testing..." : "Test"}
                            </Button>
                          )}
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => setDisconnectingId(conn.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        {/* Tool list */}
                        {tools && tools.length > 0 && (
                          <div className="border-t px-3 py-2">
                            <div className="space-y-1">
                              {tools.map((tool) => (
                                <div
                                  key={tool.name}
                                  className="flex items-center gap-2"
                                >
                                  <button
                                    type="button"
                                    className={`h-4 w-4 shrink-0 rounded border transition-colors ${
                                      tool.enabled
                                        ? "border-ring bg-ring"
                                        : "border-input bg-background"
                                    }`}
                                    onClick={() =>
                                      onToggleTool?.(
                                        conn.id,
                                        tool.name,
                                        !tool.enabled
                                      )
                                    }
                                    aria-label={`${tool.enabled ? "Disable" : "Enable"} ${tool.name}`}
                                  >
                                    {tool.enabled && (
                                      <Check className="h-3 w-3 text-white" />
                                    )}
                                  </button>
                                  <div className="min-w-0 flex-1">
                                    <span
                                      className={`text-xs font-medium ${!tool.enabled ? "text-muted-foreground line-through" : ""}`}
                                    >
                                      {tool.name}
                                    </span>
                                    {tool.description && (
                                      <span className="text-muted-foreground ml-1 text-[11px]">
                                        — {tool.description}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

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
        open={!!disconnectingId}
        onOpenChange={(open) => !open && setDisconnectingId(null)}
        title={`Disconnect ${integration.name}?`}
        description="The agent will no longer have access to this integration during calls."
        confirmLabel="Disconnect"
        onConfirm={() => {
          if (disconnectingId) {
            onDisconnect(disconnectingId);
            setDisconnectingId(null);
          }
        }}
      />
    </>
  );
}
