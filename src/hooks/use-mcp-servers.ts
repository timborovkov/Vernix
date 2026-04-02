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
    return res.json();
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
    toggleServer: (id: string, enabled: boolean) =>
      toggleMutation.mutate({ id, enabled }),
    deleteServer: (id: string) => deleteMutation.mutate(id),
  };
}
