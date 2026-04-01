"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useMeetingDetail } from "@/hooks/use-meeting-detail";
import { useKnowledge } from "@/hooks/use-knowledge";
import { useMeetingTasks } from "@/hooks/use-tasks";
import { formatDateTime } from "@/lib/date";
import { useTimezone } from "@/hooks/use-timezone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { statusVariant } from "@/lib/meetings/constants";
import { OverviewTab } from "@/components/meeting/overview-tab";
import { TranscriptTab } from "@/components/meeting/transcript-tab";
import { TasksTab } from "@/components/meeting/tasks-tab";
import { DocumentsTab } from "@/components/meeting/documents-tab";
import { ChatTab } from "@/components/meeting/chat-tab";
import {
  ArrowLeft,
  Download,
  LayoutList,
  MessageSquare,
  FileText,
  ListChecks,
  ScrollText,
} from "lucide-react";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutList },
  { id: "transcript", label: "Transcript", icon: ScrollText },
  { id: "tasks", label: "Tasks", icon: ListChecks },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "chat", label: "Chat", icon: MessageSquare },
] as const;

type TabId = (typeof TABS)[number]["id"];

function getInitialTab(): TabId {
  if (typeof window === "undefined") return "overview";
  const hash = window.location.hash.slice(1);
  if (TABS.some((t) => t.id === hash)) return hash as TabId;
  return "overview";
}

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab);

  const timezone = useTimezone();

  const {
    meeting,
    transcript,
    searchResults,
    loading,
    searching,
    error,
    search,
  } = useMeetingDetail(id);

  const {
    documents: meetingDocs,
    uploading: docsUploading,
    uploadDocument: uploadMeetingDoc,
    deleteDocument: deleteMeetingDoc,
    downloadDocument: downloadMeetingDoc,
  } = useKnowledge(id);

  const {
    tasks: meetingTasks,
    loading: tasksLoading,
    addTask,
    updateTask,
    deleteTask,
  } = useMeetingTasks(id);

  // Lifted state to persist across tab switches
  const [searchQuery, setSearchQuery] = useState("");
  const [hideCompleted, setHideCompleted] = useState(true);

  // Agenda state — synced from meeting metadata
  const meetingId = meeting?.id;
  const meetingAgenda = meeting
    ? ((((meeting.metadata ?? {}) as Record<string, unknown>).agenda as
        | string
        | undefined) ?? "")
    : "";
  const [prevMeetingId, setPrevMeetingId] = useState<string | null>(null);
  const [agenda, setAgenda] = useState(meetingAgenda);
  if (meetingId && meetingId !== prevMeetingId) {
    setPrevMeetingId(meetingId);
    setAgenda(meetingAgenda);
  }

  // Update URL hash when tab changes
  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    window.history.replaceState(
      null,
      "",
      tab === "overview" ? window.location.pathname : `#${tab}`
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="bg-muted mb-4 h-7 w-16 animate-pulse rounded-md" />
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="bg-muted h-8 w-64 animate-pulse rounded-md" />
          <div className="bg-muted h-5 w-20 animate-pulse rounded-full" />
        </div>
        <div className="mb-6 flex gap-1 border-b pb-2">
          {TABS.map((t) => (
            <div
              key={t.id}
              className="bg-muted h-8 w-24 animate-pulse rounded-md"
            />
          ))}
        </div>
        <div className="space-y-4">
          <div className="bg-muted h-32 animate-pulse rounded-xl" />
          <div className="bg-muted h-48 animate-pulse rounded-xl" />
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="text-muted-foreground py-12 text-center">
        {error ?? "Call not found"}
      </div>
    );
  }

  const isSilent = Boolean(
    (meeting.metadata as Record<string, unknown>)?.silent
  );

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <Link href="/dashboard">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{meeting.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<a href={`/api/meetings/${id}/export?format=md`} />}
          >
            <Download className="mr-1 h-3.5 w-3.5" />
            MD
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={<a href={`/api/meetings/${id}/export?format=pdf`} />}
          >
            <Download className="mr-1 h-3.5 w-3.5" />
            PDF
          </Button>
          {isSilent && <Badge variant="secondary">Silent</Badge>}
          <Badge variant={statusVariant[meeting.status] ?? "outline"}>
            {meeting.status}
          </Badge>
        </div>
      </div>

      {/* Timestamps */}
      <div className="text-muted-foreground mt-2 flex gap-4 text-sm">
        {meeting.startedAt && (
          <span>Started: {formatDateTime(meeting.startedAt, timezone)}</span>
        )}
        {meeting.endedAt && (
          <span>Ended: {formatDateTime(meeting.endedAt, timezone)}</span>
        )}
      </div>

      {/* Tab Bar */}
      <div className="mt-6 flex gap-1 overflow-x-auto border-b">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              className={`-mb-px flex items-center gap-1.5 px-3 py-2 text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-foreground border-b-2 font-medium"
                  : "text-muted-foreground hover:text-foreground border-b-2 border-transparent"
              }`}
              onClick={() => handleTabChange(tab.id)}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "overview" && (
          <OverviewTab
            meeting={meeting}
            agenda={agenda}
            onAgendaChange={setAgenda}
          />
        )}

        {activeTab === "transcript" && (
          <TranscriptTab
            transcript={transcript}
            searchResults={searchResults}
            searching={searching}
            query={searchQuery}
            onQueryChange={setSearchQuery}
            onSearch={search}
          />
        )}

        {activeTab === "tasks" && (
          <TasksTab
            tasks={meetingTasks}
            loading={tasksLoading}
            meetingStatus={meeting.status}
            hideCompleted={hideCompleted}
            onHideCompletedChange={setHideCompleted}
            onAdd={(title) => addTask(title)}
            onToggle={(taskId, status) =>
              updateTask(taskId, { status: status as "open" | "completed" })
            }
            onDelete={deleteTask}
          />
        )}

        {activeTab === "documents" && (
          <DocumentsTab
            documents={meetingDocs}
            uploading={docsUploading}
            onUpload={uploadMeetingDoc}
            onDelete={deleteMeetingDoc}
            onDownload={downloadMeetingDoc}
          />
        )}

        {/* Chat stays mounted to preserve conversation state */}
        <div className={activeTab === "chat" ? "" : "hidden"}>
          <ChatTab meetingId={id} />
        </div>
      </div>
    </div>
  );
}
