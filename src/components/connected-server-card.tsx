"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";
import {
  Plug,
  Trash2,
  FlaskConical,
  Check,
  X,
  ChevronDown,
  Wrench,
} from "lucide-react";
import type { McpAuthType } from "@/hooks/use-mcp-servers";

interface ToolInfo {
  name: string;
  description: string;
  enabled: boolean;
}

interface ServerInfo {
  id: string;
  name: string;
  url: string;
  authType: McpAuthType;
  enabled: boolean;
  disabledTools: string[] | null;
  cachedTools: { name: string; description: string }[] | null;
}

interface ConnectedServerCardProps {
  server: ServerInfo;
  onTest: (id: string) => Promise<{
    success: boolean;
    toolCount?: number;
    error?: string;
  }>;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
  onFetchTools?: (serverId: string) => Promise<{
    tools: ToolInfo[];
    cachedAt: string | null;
    stale?: boolean;
  }>;
  onToggleTool?: (serverId: string, toolName: string, enabled: boolean) => void;
}

const AUTH_LABELS: Record<McpAuthType, string> = {
  none: "No auth",
  bearer: "Bearer",
  header: "Custom header",
  basic: "Basic auth",
  oauth: "OAuth",
  url_key: "URL key",
};

export function ConnectedServerCard({
  server,
  onTest,
  onToggle,
  onDelete,
  onFetchTools,
  onToggleTool,
}: ConnectedServerCardProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    toolCount?: number;
    error?: string;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [tools, setTools] = useState<ToolInfo[] | null>(null);
  const [loadingTools, setLoadingTools] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await onTest(server.id);
      setTestResult(result);
      if (result.success) {
        toast.success(`Connected — ${result.toolCount} tools available`);
        // Refresh tools after test (separate error handling to avoid clobbering test result)
        if (onFetchTools) {
          onFetchTools(server.id)
            .then((fresh) => setTools(fresh.tools))
            .catch(() => {});
        }
      } else {
        toast.error(result.error ?? "Connection failed");
      }
    } catch {
      setTestResult({ success: false, error: "Test failed" });
      toast.error("Connection test failed");
    } finally {
      setTesting(false);
    }
  };

  const handleLoadTools = async () => {
    if (!onFetchTools || tools || loadingTools) return;
    setLoadingTools(true);
    try {
      const result = await onFetchTools(server.id);
      setTools(result.tools);
    } catch {
      toast.error("Failed to load tools");
    } finally {
      setLoadingTools(false);
    }
  };

  const getDisplayTools = (): ToolInfo[] | null => {
    // Use fetched tools for names/descriptions, but always derive enabled
    // from the latest server.disabledTools (from query cache) to stay in sync
    const disabledSet = new Set(server.disabledTools ?? []);
    const baseTols = tools ?? server.cachedTools;
    if (!baseTols) return null;
    return baseTols.map((t) => ({
      name: t.name,
      description: t.description,
      enabled: !disabledSet.has(t.name),
    }));
  };

  const displayTools = expanded ? getDisplayTools() : null;

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
              <Plug className="h-4 w-4 text-gray-500" />
            </div>

            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => setExpanded(!expanded)}
            >
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium">{server.name}</p>
                <Badge variant="outline" className="text-[10px]">
                  {AUTH_LABELS[server.authType]}
                </Badge>
                {testResult &&
                  (testResult.success ? (
                    <Badge
                      variant="secondary"
                      className="bg-green-500/10 text-green-600"
                    >
                      <Check className="mr-0.5 h-3 w-3" />
                      {testResult.toolCount} tools
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[10px]">
                      <X className="mr-0.5 h-3 w-3" />
                      Failed
                    </Badge>
                  ))}
              </div>
              <p className="text-muted-foreground truncate text-xs">
                {server.url}
              </p>
            </button>

            <div className="flex shrink-0 items-center gap-2">
              <Button
                size="xs"
                variant="outline"
                disabled={testing}
                onClick={handleTest}
              >
                <FlaskConical className="mr-1 h-3 w-3" />
                {testing ? "Testing..." : "Test"}
              </Button>
              <Button
                size="xs"
                variant={server.enabled ? "outline" : "ghost"}
                onClick={() => onToggle(server.id, !server.enabled)}
              >
                {server.enabled ? "Enabled" : "Disabled"}
              </Button>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
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
          </div>

          {/* Expanded tools section */}
          {expanded && (
            <div className="border-t px-4 pt-3 pb-3">
              {!displayTools && onFetchTools && (
                <Button
                  size="xs"
                  variant="outline"
                  disabled={loadingTools}
                  onClick={handleLoadTools}
                >
                  <Wrench className="mr-1 h-3 w-3" />
                  {loadingTools ? "Loading tools..." : "Load tools"}
                </Button>
              )}
              {displayTools && displayTools.length > 0 && (
                <div className="space-y-1">
                  <p className="text-muted-foreground mb-1 text-[11px] font-medium tracking-wide uppercase">
                    Tools ({displayTools.filter((t) => t.enabled).length}/
                    {displayTools.length} enabled)
                  </p>
                  {displayTools.map((tool) => (
                    <div key={tool.name} className="flex items-center gap-2">
                      <button
                        type="button"
                        className={`h-4 w-4 shrink-0 rounded border transition-colors ${
                          tool.enabled
                            ? "border-ring bg-ring"
                            : "border-input bg-background"
                        }`}
                        onClick={() =>
                          onToggleTool?.(server.id, tool.name, !tool.enabled)
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
              )}
              {displayTools && displayTools.length === 0 && (
                <p className="text-muted-foreground text-xs">
                  No tools available from this server.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Remove ${server.name}?`}
        description="This will disconnect the MCP server and remove its configuration."
        confirmLabel="Remove"
        onConfirm={() => {
          setConfirmDelete(false);
          onDelete(server.id);
        }}
      />
    </>
  );
}
