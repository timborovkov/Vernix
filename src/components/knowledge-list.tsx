"use client";

import type { DocumentWithMeeting } from "@/hooks/use-knowledge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Trash2, AlertCircle, Loader2, Download } from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/date";
import { useTimezone } from "@/hooks/use-timezone";

const FILE_TYPE_LABELS: Record<string, string> = {
  pdf: "PDF",
  docx: "DOCX",
  txt: "TXT",
  md: "MD",
};

const STATUS_STYLES: Record<string, string> = {
  processing: "text-yellow-600 bg-yellow-50",
  ready: "text-green-600 bg-green-50",
  failed: "text-red-600 bg-red-50",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface KnowledgeListProps {
  documents: DocumentWithMeeting[];
  onDelete: (id: string) => void;
  onDownload: (id: string) => void;
  showMeetingLink?: boolean;
}

export function KnowledgeList({
  documents,
  onDelete,
  onDownload,
  showMeetingLink,
}: KnowledgeListProps) {
  const timezone = useTimezone();
  if (documents.length === 0) {
    return (
      <div className="text-muted-foreground py-12 text-center">
        <FileText className="mx-auto mb-3 h-12 w-12 opacity-40" />
        <p className="text-lg font-medium">No documents yet</p>
        <p className="text-sm">
          Upload PDF, DOCX, TXT, or Markdown files to enrich the AI&apos;s
          context.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <Card key={doc.id}>
          <CardContent className="flex items-center gap-3 py-3">
            <FileText className="text-muted-foreground h-5 w-5 shrink-0" />

            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{doc.fileName}</p>
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <span className="bg-muted rounded px-1.5 py-0.5 font-mono">
                  {FILE_TYPE_LABELS[doc.fileType] ?? doc.fileType.toUpperCase()}
                </span>
                <span>{formatFileSize(doc.fileSize)}</span>
                <span>{formatDateTime(doc.createdAt, timezone)}</span>
                {doc.status === "ready" && doc.chunkCount > 0 && (
                  <span>{doc.chunkCount} chunks</span>
                )}
                {showMeetingLink && doc.meetingId && doc.meetingTitle && (
                  <Link
                    href={`/dashboard/call/${doc.meetingId}`}
                    className="truncate text-blue-600 hover:underline"
                  >
                    {doc.meetingTitle}
                  </Link>
                )}
              </div>
            </div>

            <span
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[doc.status] ?? ""}`}
            >
              {doc.status === "processing" && (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
              {doc.status === "failed" && <AlertCircle className="h-3 w-3" />}
              {doc.status}
            </span>

            {doc.error && (
              <span className="max-w-48 truncate text-xs text-red-600">
                {doc.error}
              </span>
            )}

            {doc.status === "ready" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDownload(doc.id)}
                aria-label={`Download ${doc.fileName}`}
                className="text-muted-foreground shrink-0"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(doc.id)}
              aria-label={`Delete ${doc.fileName}`}
              className="text-muted-foreground hover:text-destructive shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
