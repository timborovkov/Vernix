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
import { Server, Trash2, Plus } from "lucide-react";

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

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    onAdd(name.trim(), url.trim(), apiKey.trim() || undefined);
    setName("");
    setUrl("");
    setApiKey("");
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">MCP Servers</h3>
        <Dialog open={open} onOpenChange={setOpen}>
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
                  onChange={(e) => setUrl(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serverApiKey">API Key (optional)</Label>
                <Input
                  id="serverApiKey"
                  placeholder="Bearer token for the server"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={!name.trim() || !url.trim()}
              >
                Add Server
              </Button>
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
          <Card key={server.id}>
            <CardContent className="flex items-center gap-3 py-2.5">
              <Server className="text-muted-foreground h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{server.name}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {server.url}
                </p>
              </div>
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
        ))
      )}
    </div>
  );
}
