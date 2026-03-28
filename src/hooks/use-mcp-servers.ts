"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";

interface McpServerInfo {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

async function fetchServers(): Promise<McpServerInfo[]> {
  const res = await fetch("/api/settings/mcp-servers");
  if (!res.ok) throw new Error("Failed to load MCP servers");
  const data = await res.json();
  return data.servers;
}

export function useMcpServers() {
  const queryClient = useQueryClient();

  const { data: servers = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.mcpServers.all,
    queryFn: fetchServers,
    meta: { errorMessage: "Failed to load MCP servers" },
  });

  const addMutation = useMutation({
    mutationFn: async (params: {
      name: string;
      url: string;
      apiKey?: string;
    }) => {
      const res = await fetch("/api/settings/mcp-servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error("Failed to add MCP server");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mcpServers.all });
      toast.success("MCP server added");
    },
    onError: () => toast.error("Failed to add MCP server"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const res = await fetch(`/api/settings/mcp-servers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error("Failed to update server");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mcpServers.all });
    },
    onError: () => toast.error("Failed to update server"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/settings/mcp-servers/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete server");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mcpServers.all });
      toast.success("MCP server removed");
    },
    onError: () => toast.error("Failed to delete server"),
  });

  return {
    servers,
    loading,
    addServer: async (name: string, url: string, apiKey?: string) => {
      await addMutation.mutateAsync({ name, url, apiKey });
    },
    toggleServer: (id: string, enabled: boolean) =>
      toggleMutation.mutate({ id, enabled }),
    deleteServer: (id: string) => deleteMutation.mutate(id),
  };
}
