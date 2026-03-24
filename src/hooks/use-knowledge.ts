"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Document } from "@/lib/db/schema";
import { queryKeys } from "@/lib/query-keys";

async function fetchDocuments(meetingId?: string): Promise<Document[]> {
  const url = meetingId
    ? `/api/knowledge?meetingId=${meetingId}`
    : "/api/knowledge";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load documents");
  const data = await res.json();
  return data.documents;
}

export function useKnowledge(meetingId?: string) {
  const queryClient = useQueryClient();
  const qk = queryKeys.knowledge.all(meetingId);

  const { data: documents = [], isLoading: loading } = useQuery({
    queryKey: qk,
    queryFn: () => fetchDocuments(meetingId),
    meta: { errorMessage: "Failed to load documents" },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      if (meetingId) formData.append("meetingId", meetingId);

      const res = await fetch("/api/knowledge", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk });
      toast.success("Document uploaded");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to upload document");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete document");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk });
      toast.success("Document deleted");
    },
    onError: () => toast.error("Failed to delete document"),
  });

  const uploadDocument = async (file: File) => {
    const doc = await uploadMutation.mutateAsync(file);
    return doc;
  };

  const deleteDocument = (id: string) => deleteMutation.mutate(id);

  const downloadDocument = async (id: string) => {
    try {
      const res = await fetch(`/api/knowledge/${id}`);
      if (!res.ok) {
        toast.error("Failed to get download link");
        return;
      }
      const data = await res.json();
      window.open(data.downloadUrl, "_blank");
    } catch {
      toast.error("Failed to get download link");
    }
  };

  return {
    documents,
    loading,
    uploading: uploadMutation.isPending,
    uploadDocument,
    deleteDocument,
    downloadDocument,
    refresh: () => queryClient.invalidateQueries({ queryKey: qk }),
  };
}
