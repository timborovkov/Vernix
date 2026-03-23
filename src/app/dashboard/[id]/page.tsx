"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useMeetingDetail } from "@/hooks/use-meeting-detail";
import { useKnowledge } from "@/hooks/use-knowledge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { statusVariant } from "@/lib/meetings/constants";
import { ChatPanel } from "@/components/chat-panel";
import { KnowledgeList } from "@/components/knowledge-list";
import { UploadDocumentDialog } from "@/components/upload-document-dialog";
import { formatTime, renderMarkdown } from "@/lib/format";
import { ArrowLeft, Search, Clock, Users, FileText, Save } from "lucide-react";

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    meeting,
    transcript,
    searchResults,
    loading,
    searching,
    error,
    search,
  } = useMeetingDetail(id);
  const [query, setQuery] = useState("");

  const meetingMetadata = meeting?.metadata as Record<string, unknown>;
  const [agenda, setAgenda] = useState("");
  const [agendaSaving, setAgendaSaving] = useState(false);
  const [agendaLoaded, setAgendaLoaded] = useState(false);

  // Sync agenda from meeting metadata on load
  if (meeting && !agendaLoaded) {
    setAgenda((meetingMetadata?.agenda as string) ?? "");
    setAgendaLoaded(true);
  }

  const {
    documents: meetingDocs,
    uploading: docsUploading,
    uploadDocument: uploadMeetingDoc,
    deleteDocument: deleteMeetingDoc,
    downloadDocument: downloadMeetingDoc,
  } = useKnowledge(id);

  // Agenda is editable until the meeting becomes active — the voice agent
  // only receives its instructions when the token is issued (status: "active").
  const isEditable =
    meeting?.status === "pending" ||
    meeting?.status === "joining" ||
    meeting?.status === "failed";

  const saveAgenda = async () => {
    setAgendaSaving(true);
    try {
      const res = await fetch(`/api/meetings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agenda }),
      });
      if (!res.ok) throw new Error();
      toast.success("Agenda saved");
    } catch {
      toast.error("Failed to save agenda");
    } finally {
      setAgendaSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-muted-foreground py-12 text-center">Loading...</div>
    );
  }

  if (!meeting) {
    return (
      <div className="text-muted-foreground py-12 text-center">
        {error ?? "Meeting not found"}
      </div>
    );
  }

  const summary = (meeting.metadata as Record<string, unknown>)?.summary as
    | string
    | undefined;
  const participants = (meeting.participants as string[]) ?? [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    search(query);
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <Link href="/dashboard">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{meeting.title}</h1>
        <Badge variant={statusVariant[meeting.status] ?? "outline"}>
          {meeting.status}
        </Badge>
      </div>

      {/* Timestamps */}
      <div className="text-muted-foreground mt-2 flex gap-4 text-sm">
        {meeting.startedAt && (
          <span>Started: {new Date(meeting.startedAt).toLocaleString()}</span>
        )}
        {meeting.endedAt && (
          <span>Ended: {new Date(meeting.endedAt).toLocaleString()}</span>
        )}
      </div>

      {/* Agenda */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Agenda</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={agenda}
            onChange={(e) => setAgenda(e.target.value)}
            placeholder="Meeting goals, topics to discuss, prep notes..."
            rows={3}
            disabled={!isEditable}
            className="border-input bg-background placeholder:text-muted-foreground w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
          />
          {isEditable && (
            <Button
              size="sm"
              className="mt-2"
              onClick={saveAgenda}
              disabled={agendaSaving}
            >
              <Save className="mr-1 h-3 w-3" />
              {agendaSaving ? "Saving..." : "Save Agenda"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {meeting.status === "processing" && !summary ? (
            <p className="text-muted-foreground italic">
              Generating summary...
            </p>
          ) : summary ? (
            <div
              className="space-y-2 text-sm [&_li]:mt-1 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(summary) }}
            />
          ) : (
            <p className="text-muted-foreground italic">No summary available</p>
          )}
        </CardContent>
      </Card>

      {/* Participants */}
      {participants.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
            <Users className="h-4 w-4" />
            Participants
          </h2>
          <div className="flex flex-wrap gap-2">
            {participants.map((name) => (
              <Badge key={name} variant="secondary">
                {name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mt-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Search transcript..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button type="submit" size="sm" disabled={searching}>
            <Search className="mr-1 h-4 w-4" />
            {searching ? "Searching..." : "Search"}
          </Button>
        </form>

        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-medium">
              {searchResults.length} results
            </h3>
            {searchResults.map((result, i) => (
              <Card key={i}>
                <CardContent className="py-3">
                  <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs">
                    <span className="font-medium">{result.speaker}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(result.timestamp_ms)}
                    </span>
                    <span className="ml-auto">
                      Score: {result.score.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm">{result.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Meeting Documents */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <FileText className="h-4 w-4" />
            Documents
          </h2>
          <UploadDocumentDialog
            onUpload={uploadMeetingDoc}
            uploading={docsUploading}
          />
        </div>
        <KnowledgeList
          documents={meetingDocs}
          onDelete={deleteMeetingDoc}
          onDownload={downloadMeetingDoc}
        />
      </div>

      {/* Chat */}
      <div className="mt-6">
        <ChatPanel meetingId={id} placeholder="Ask about this meeting..." />
      </div>

      {/* Transcript Timeline */}
      <div className="mt-6">
        <h2 className="mb-4 text-lg font-semibold">Transcript</h2>
        {transcript.length === 0 ? (
          <p className="text-muted-foreground italic">
            No transcript available
          </p>
        ) : (
          <div className="space-y-3">
            {transcript.map((segment, i) => (
              <div key={i} className="flex gap-3">
                <div className="text-muted-foreground w-12 shrink-0 pt-0.5 text-right text-xs">
                  {formatTime(segment.timestampMs)}
                </div>
                <div>
                  <span className="text-sm font-medium">{segment.speaker}</span>
                  <p className="text-sm">{segment.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
