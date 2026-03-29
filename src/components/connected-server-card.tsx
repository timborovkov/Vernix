"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";
import { Plug, Trash2, FlaskConical, Check, X } from "lucide-react";
import type { McpAuthType } from "@/hooks/use-mcp-servers";

interface ServerInfo {
  id: string;
  name: string;
  url: string;
  authType: McpAuthType;
  enabled: boolean;
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
}: ConnectedServerCardProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    toolCount?: number;
    error?: string;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await onTest(server.id);
      setTestResult(result);
      if (result.success) {
        toast.success(`Connected — ${result.toolCount} tools available`);
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

  return (
    <>
      <Card>
        <CardContent className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
            <Plug className="h-4 w-4 text-gray-500" />
          </div>

          <div className="min-w-0 flex-1">
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
          </div>

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
          </div>
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
