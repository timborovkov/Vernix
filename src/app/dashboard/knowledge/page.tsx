"use client";

import Link from "next/link";
import { useKnowledge } from "@/hooks/use-knowledge";
import { KnowledgeList } from "@/components/knowledge-list";
import { UploadDocumentDialog } from "@/components/upload-document-dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function KnowledgePage() {
  const {
    documents,
    loading,
    uploading,
    uploadDocument,
    deleteDocument,
    downloadDocument,
  } = useKnowledge();

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" render={<Link href="/dashboard" />}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Knowledge Base</h1>
            <p className="text-muted-foreground text-sm">
              Upload documents to enrich AI responses
            </p>
          </div>
        </div>
        <UploadDocumentDialog onUpload={uploadDocument} uploading={uploading} />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border p-4"
            >
              <div className="bg-muted h-5 w-5 animate-pulse rounded" />
              <div className="flex-1">
                <div className="bg-muted mb-2 h-4 w-48 animate-pulse rounded-md" />
                <div className="bg-muted h-3 w-32 animate-pulse rounded-md" />
              </div>
              <div className="bg-muted h-5 w-14 animate-pulse rounded-full" />
              <div className="bg-muted h-7 w-7 animate-pulse rounded-md" />
            </div>
          ))}
        </div>
      ) : (
        <KnowledgeList
          documents={documents}
          onDelete={deleteDocument}
          onDownload={downloadDocument}
        />
      )}
    </div>
  );
}
