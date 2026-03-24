"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";

interface ApiKeyInfo {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

async function fetchKeys(): Promise<ApiKeyInfo[]> {
  const res = await fetch("/api/settings/api-keys");
  if (!res.ok) throw new Error("Failed to load API keys");
  const data = await res.json();
  return data.keys;
}

export function useApiKeys() {
  const queryClient = useQueryClient();

  const { data: keys = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.apiKeys.all,
    queryFn: fetchKeys,
    meta: { errorMessage: "Failed to load API keys" },
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to create API key");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.all });
    },
    onError: () => {
      toast.error("Failed to create API key");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/settings/api-keys/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete API key");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.all });
      toast.success("API key deleted");
    },
    onError: () => {
      toast.error("Failed to delete API key");
    },
  });

  const createKey = async (name: string): Promise<string | null> => {
    try {
      const data = await createMutation.mutateAsync(name);
      return data.rawKey;
    } catch {
      return null;
    }
  };

  const deleteKey = async (id: string) => {
    deleteMutation.mutate(id);
  };

  return { keys, loading, createKey, deleteKey };
}
