"use client";

import { useState } from "react";
interface McpServerInfo {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
}
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Server, Trash2, Plus, Zap, CheckCircle, XCircle } from "lucide-react";

interface TestResult {
  success: boolean;
  toolCount?: number;
  tools?: { name: string; description: string }[];
  error?: string;
}

interface McpServerListProps {
  servers: McpServerInfo[];
  onAdd: (name: string, url: string, apiKey?: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
}

export function McpServerList({
  servers,
  onAdd,
  onToggle,
  onDelete,
}: McpServerListProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [formTesting, setFormTesting] = useState(false);
  const [formTestResult, setFormTestResult] = useState<TestResult | null>(null);

  // Per-server test state
  const [serverTesting, setServerTesting] = useState<Record<string, boolean>>(
    {}
  );
  const [serverTestResults, setServerTestResults] = useState<
    Record<string, TestResult>
  >({});

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    onAdd(name.trim(), url.trim(), apiKey.trim() || undefined);
    setName("");
    setUrl("");
    setApiKey("");
    setFormTestResult(null);
    setOpen(false);
  };

  const handleFormUrlChange = (value: string) => {
    setUrl(value);
    setFormTestResult(null);
  };

  const handleFormApiKeyChange = (value: string) => {
    setApiKey(value);
    setFormTestResult(null);
  };

  const testFormConnection = async () => {
    if (!url.trim()) return;
    setFormTesting(true);
    setFormTestResult(null);
    try {
      const res = await fetch("/api/settings/mcp-servers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          apiKey: apiKey.trim() || undefined,
        }),
      });
      const data = (await res.json()) as TestResult;
      setFormTestResult(data);
    } catch {
      setFormTestResult({ success: false, error: "Request failed" });
    } finally {
      setFormTesting(false);
    }
  };

  const testServer = async (id: string) => {
    setServerTesting((prev) => ({ ...prev, [id]: true }));
    setServerTestResults((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    try {
      const res = await fetch("/api/settings/mcp-servers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await res.json()) as TestResult;
      setServerTestResults((prev) => ({ ...prev, [id]: data }));
    } catch {
      setServerTestResults((prev) => ({
        ...prev,
        [id]: { success: false, error: "Request failed" },
      }));
    } finally {
      setServerTesting((prev) => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">MCP Servers</h3>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) {
              setName("");
              setUrl("");
              setApiKey("");
              setFormTestResult(null);
            }
          }}
        >
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="mr-1 h-4 w-4" />
            Add Server
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add MCP Server</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="serverName">Name</Label>
                <Input
                  id="serverName"
                  placeholder="e.g. Company CRM"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serverUrl">URL</Label>
                <Input
                  id="serverUrl"
                  placeholder="https://mcp.example.com/sse"
                  type="url"
                  value={url}
                  onChange={(e) => handleFormUrlChange(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serverApiKey">API Key (optional)</Label>
                <Input
                  id="serverApiKey"
                  placeholder="Bearer token for the server"
                  value={apiKey}
                  onChange={(e) => handleFormApiKeyChange(e.target.value)}
                />
              </div>

              {/* Test result */}
              {formTestResult && <TestResultDisplay result={formTestResult} />}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={!url.trim() || formTesting}
                  onClick={testFormConnection}
                >
                  <Zap className="mr-1 h-4 w-4" />
                  {formTesting ? "Testing..." : "Test Connection"}
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={!name.trim() || !url.trim()}
                >
                  Add Server
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {servers.length === 0 ? (
        <p className="text-muted-foreground text-sm italic">
          No MCP servers configured. Add one to give the AI agent access to
          external tools.
        </p>
      ) : (
        servers.map((server) => (
          <div key={server.id} className="space-y-1">
            <Card>
              <CardContent className="flex items-center gap-3 py-2.5">
                <Server className="text-muted-foreground h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{server.name}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {server.url}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => testServer(server.id)}
                  disabled={serverTesting[server.id]}
                  className="text-muted-foreground shrink-0"
                  title="Test connection"
                >
                  <Zap className="h-4 w-4" />
                </Button>
                <Badge
                  variant={server.enabled ? "default" : "secondary"}
                  className="shrink-0 cursor-pointer"
                  onClick={() => onToggle(server.id, !server.enabled)}
                >
                  {server.enabled ? "Enabled" : "Disabled"}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(server.id)}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
            {serverTestResults[server.id] && (
              <div className="px-1">
                <TestResultDisplay result={serverTestResults[server.id]!} />
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function TestResultDisplay({ result }: { result: TestResult }) {
  if (result.success) {
    return (
      <div className="rounded-md border border-green-200 bg-green-50 p-3 text-xs dark:border-green-800 dark:bg-green-950">
        <div className="mb-1 flex items-center gap-1.5 font-medium text-green-700 dark:text-green-400">
          <CheckCircle className="h-3.5 w-3.5" />
          Connected — {result.toolCount} tool{result.toolCount !== 1 ? "s" : ""}{" "}
          available
        </div>
        {result.tools && result.tools.length > 0 && (
          <ul className="ml-5 space-y-0.5 text-green-600 dark:text-green-500">
            {result.tools.map((t) => (
              <li key={t.name}>
                <span className="font-medium">{t.name}</span>
                {t.description && (
                  <span className="text-green-500 dark:text-green-600">
                    {" "}
                    — {t.description}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs dark:border-red-800 dark:bg-red-950">
      <div className="flex items-center gap-1.5 font-medium text-red-700 dark:text-red-400">
        <XCircle className="h-3.5 w-3.5" />
        Connection failed
      </div>
      {result.error && (
        <p className="mt-1 text-red-600 dark:text-red-500">{result.error}</p>
      )}
    </div>
  );
}
