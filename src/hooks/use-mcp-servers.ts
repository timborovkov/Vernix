"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
interface McpServerInfo {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useMcpServers() {
  const [servers, setServers] = useState<McpServerInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchServers = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/mcp-servers");
      if (!res.ok) return;
      const data = await res.json();
      setServers(data.servers);
    } catch {
      toast.error("Failed to load MCP servers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  const addServer = async (name: string, url: string, apiKey?: string) => {
    try {
      const res = await fetch("/api/settings/mcp-servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url, apiKey }),
      });
      if (!res.ok) {
        toast.error("Failed to add MCP server");
        return;
      }
      const server = await res.json();
      setServers((prev) => [server, ...prev]);
      toast.success("MCP server added");
    } catch {
      toast.error("Failed to add MCP server");
    }
  };

  const toggleServer = async (id: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/settings/mcp-servers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) {
        toast.error("Failed to update server");
        return;
      }
      const updated = await res.json();
      setServers((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } catch {
      toast.error("Failed to update server");
    }
  };

  const deleteServer = async (id: string) => {
    try {
      const res = await fetch(`/api/settings/mcp-servers/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Failed to delete server");
        return;
      }
      setServers((prev) => prev.filter((s) => s.id !== id));
      toast.success("MCP server removed");
    } catch {
      toast.error("Failed to delete server");
    }
  };

  return { servers, loading, addServer, toggleServer, deleteServer };
}
