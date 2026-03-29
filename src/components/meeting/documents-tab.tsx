"use client";

import { KnowledgeList } from "@/components/knowledge-list";
import { UploadDocumentDialog } from "@/components/upload-document-dialog";
import { FileText } from "lucide-react";
import type { Document } from "@/lib/db/schema";

interface DocumentsTabProps {
  documents: Document[];
  uploading: boolean;
  onUpload: (file: File) => Promise<void>;
  onDelete: (id: string) => void;
  onDownload: (id: string) => void;
}

export function DocumentsTab({
  documents,
  uploading,
  onUpload,
  onDelete,
  onDownload,
}: DocumentsTabProps) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <FileText className="h-4 w-4" />
          Documents
        </h2>
        <UploadDocumentDialog onUpload={onUpload} uploading={uploading} />
      </div>
      <KnowledgeList
        documents={documents}
        onDelete={onDelete}
        onDownload={onDownload}
      />
    </div>
  );
}
