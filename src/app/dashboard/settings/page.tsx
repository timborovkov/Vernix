"use client";

import Link from "next/link";
import { useApiKeys } from "@/hooks/use-api-keys";
import { useMcpServers } from "@/hooks/use-mcp-servers";
import { ApiKeyList } from "@/components/api-key-list";
import { McpServerList } from "@/components/mcp-server-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function SettingsPage() {
  const { keys, createKey, deleteKey } = useApiKeys();
  const { servers, addServer, toggleServer, deleteServer } = useMcpServers();

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center gap-3">
        <Button variant="ghost" size="sm" render={<Link href="/dashboard" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm">
            Manage API keys and MCP server connections
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">MCP Server Access</CardTitle>
            <p className="text-muted-foreground text-sm">
              Generate API keys to connect from Claude Desktop, Cursor, or other
              MCP clients.
            </p>
          </CardHeader>
          <CardContent>
            <ApiKeyList keys={keys} onCreate={createKey} onDelete={deleteKey} />
          </CardContent>
        </Card>

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
