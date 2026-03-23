"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Document } from "@/lib/db/schema";

export function useKnowledge(meetingId?: string) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      const url = meetingId
        ? `/api/knowledge?meetingId=${meetingId}`
        : "/api/knowledge";
      const res = await fetch(url);
      if (!res.ok) {
        toast.error("Failed to load documents", { id: "fetch-docs-error" });
        return;
      }
      const data = await res.json();
      setDocuments(data.documents);
    } catch {
      toast.error("Failed to load documents", { id: "fetch-docs-error" });
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const uploadDocument = async (file: File) => {
    setUploading(true);
    try {
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

      const doc = await res.json();
      setDocuments((prev) => [doc, ...prev]);
      toast.success("Document uploaded");
      return doc;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to upload document";
      toast.error(message);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      const res = await fetch(`/api/knowledge/${id}`, { method: "DELETE" });

      if (!res.ok) {
        toast.error("Failed to delete document");
        return;
      }

      setDocuments((prev) => prev.filter((d) => d.id !== id));
      toast.success("Document deleted");
    } catch {
      toast.error("Failed to delete document");
    }
  };

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
    uploading,
    uploadDocument,
    deleteDocument,
    downloadDocument,
    refresh: fetchDocuments,
  };
}
