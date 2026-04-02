"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";

export type McpAuthType =
  | "none"
  | "bearer"
  | "header"
  | "basic"
  | "oauth"
  | "url_key";

interface McpServerInfo {
  id: string;
  name: string;
  url: string;
  authType: McpAuthType;
  catalogIntegrationId: string | null;
  enabled: boolean;
  disabledTools: string[] | null;
  cachedTools: { name: string; description: string }[] | null;
  toolsCachedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AddServerParams {
  name: string;
  url: string;
  authType?: McpAuthType;
  authHeaderName?: string;
  authHeaderValue?: string;
  authKeyParam?: string;
  authUsername?: string;
  authPassword?: string;
  catalogIntegrationId?: string;
  // Legacy
  apiKey?: string;
}

interface BillingAwareError extends Error {
  isBillingLimit?: boolean;
}

async function fetchServers(): Promise<McpServerInfo[]> {
  const res = await fetch("/api/settings/mcp-servers");
  if (!res.ok) throw new Error("Failed to load MCP servers");
  const data = await res.json();
  return data.servers;
}

export function useMcpServers(opts?: {
  onBillingError?: (message: string) => void;
}) {
  const { onBillingError } = opts ?? {};
  const queryClient = useQueryClient();

  const { data: servers = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.mcpServers.all,
    queryFn: fetchServers,
    meta: { errorMessage: "Failed to load MCP servers" },
  });

  const addMutation = useMutation({
    mutationFn: async (params: AddServerParams) => {
      const res = await fetch("/api/settings/mcp-servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const err = new Error(data.error ?? "Failed to add MCP server");
        (err as BillingAwareError).isBillingLimit = res.status === 403;
        throw err;
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mcpServers.all });
      toast.success("MCP server added");
    },
    onError: (err: BillingAwareError) => {
      if (err.isBillingLimit) {
        onBillingError?.(err.message);
      } else {
        toast.error(err.message);
      }
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const res = await fetch(`/api/settings/mcp-servers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const err = new Error(data.error ?? "Failed to update server");
        (err as BillingAwareError).isBillingLimit =
          res.status === 403 && data.code === "BILLING_LIMIT";
        throw err;
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mcpServers.all });
    },
    onError: (err: BillingAwareError) => {
      if (err.isBillingLimit) {
        onBillingError?.(err.message);
      } else {
        toast.error(err.message);
      }
    },
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

  const oauthMutation = useMutation({
    mutationFn: async (params: {
      integrationId: string;
      serverUrl?: string;
    }) => {
      const res = await fetch("/api/mcp/oauth/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to start OAuth");
      }
      return res.json() as Promise<{
        authorizationUrl?: string;
        authorized?: boolean;
        serverId: string;
      }>;
    },
    onSuccess: (data) => {
      if (data.authorizationUrl) {
        // Redirect to OAuth provider
        window.location.href = data.authorizationUrl;
      } else if (data.authorized) {
        // Already authorized (tokens still valid)
        queryClient.invalidateQueries({ queryKey: queryKeys.mcpServers.all });
        toast.success("Already connected");
      }
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "OAuth failed"),
  });

  const testServer = async (
    id: string
  ): Promise<{
    success: boolean;
    toolCount?: number;
    tools?: { name: string; description: string }[];
    error?: string;
  }> => {
    const res = await fetch("/api/settings/mcp-servers/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const result = await res.json();
    // Refresh server list to pick up cached tools
    if (result.success) {
      queryClient.invalidateQueries({ queryKey: queryKeys.mcpServers.all });
    }
    return result;
  };

  const fetchTools = async (
    serverId: string
  ): Promise<{
    tools: { name: string; description: string; enabled: boolean }[];
    cachedAt: string | null;
    stale?: boolean;
  }> => {
    const res = await fetch(`/api/settings/mcp-servers/${serverId}/tools`);
    if (!res.ok) throw new Error("Failed to fetch tools");
    return res.json();
  };

  const toggleToolMutation = useMutation({
    mutationFn: async ({
      serverId,
      disabledTools,
    }: {
      serverId: string;
      disabledTools: string[];
    }) => {
      const res = await fetch(`/api/settings/mcp-servers/${serverId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabledTools }),
      });
      if (!res.ok) throw new Error("Failed to update tool settings");
      return res.json();
    },
    onMutate: async ({ serverId, disabledTools }) => {
      // Cancel outgoing refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.mcpServers.all });
      const previous = queryClient.getQueryData<McpServerInfo[]>(
        queryKeys.mcpServers.all
      );
      // Optimistically update the cache to prevent stale reads on rapid toggles
      queryClient.setQueryData<McpServerInfo[]>(
        queryKeys.mcpServers.all,
        (old) =>
          old?.map((s) => (s.id === serverId ? { ...s, disabledTools } : s)) ??
          []
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      // Roll back on failure
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.mcpServers.all, context.previous);
      }
      toast.error("Failed to update tool settings");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mcpServers.all });
    },
  });

  const toggleTool = (serverId: string, toolName: string, enabled: boolean) => {
    // Read from query cache to get the latest optimistic state
    const cached = queryClient.getQueryData<McpServerInfo[]>(
      queryKeys.mcpServers.all
    );
    const server = cached?.find((s) => s.id === serverId);
    if (!server) return; // Cache not loaded yet
    const current = server.disabledTools ?? [];
    const disabledTools = enabled
      ? current.filter((t) => t !== toolName)
      : [...current, toolName];
    toggleToolMutation.mutate({ serverId, disabledTools });
  };

  return {
    servers,
    loading,
    addServer: async (params: AddServerParams) => {
      await addMutation.mutateAsync(params);
    },
    startOAuth: async (integrationId: string, serverUrl?: string) => {
      await oauthMutation.mutateAsync({ integrationId, serverUrl });
    },
    oauthLoading: oauthMutation.isPending,
    testServer,
    fetchTools,
    toggleTool,
    toggleServer: (id: string, enabled: boolean) =>
      toggleMutation.mutate({ id, enabled }),
    deleteServer: (id: string) => deleteMutation.mutate(id),
  };
}
