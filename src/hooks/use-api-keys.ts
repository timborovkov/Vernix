"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface ApiKeyInfo {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export function useApiKeys() {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/api-keys");
      if (!res.ok) return;
      const data = await res.json();
      setKeys(data.keys);
    } catch {
      toast.error("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const createKey = async (name: string): Promise<string | null> => {
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        toast.error("Failed to create API key");
        return null;
      }
      const data = await res.json();
      setKeys((prev) => [data, ...prev]);
      return data.rawKey;
    } catch {
      toast.error("Failed to create API key");
      return null;
    }
  };

  const deleteKey = async (id: string) => {
    try {
      const res = await fetch(`/api/settings/api-keys/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Failed to delete API key");
        return;
      }
      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast.success("API key deleted");
    } catch {
      toast.error("Failed to delete API key");
    }
  };

  return { keys, loading, createKey, deleteKey };
}
