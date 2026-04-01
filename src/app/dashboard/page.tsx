"use client";

import { useState } from "react";
import { useMeetings } from "@/hooks/use-meetings";
import { useAllTasks } from "@/hooks/use-all-tasks";
import { MeetingList } from "@/components/meeting-list";
import { CreateMeetingDialog } from "@/components/create-meeting-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatPanel } from "@/components/chat-panel";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MessageSquare,
  ListChecks,
  Circle,
  CheckCircle2,
  Video,
  FileText,
  Plug,
} from "lucide-react";
import { TrialPromptBanner } from "@/components/trial-prompt-banner";

const STATUS_FILTERS = [
  "all",
  "pending",
  "active",
  "completed",
  "failed",
] as const;

export default function DashboardPage() {
  const {
    meetings,
    loading,
    createMeeting,
    joinAgent,
    stopAgent,
    deleteMeeting,
  } = useMeetings();

  const { tasks: pendingTasks, updateTask } = useAllTasks("open");

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showChat, setShowChat] = useState(false);

  const filtered = meetings.filter((m) => {
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    if (
      searchQuery &&
      !m.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Page-specific controls */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Button
          variant={showChat ? "default" : "outline"}
          size="sm"
          onClick={() => setShowChat(!showChat)}
        >
          <MessageSquare className="mr-1 h-4 w-4" />
          <span className="hidden sm:inline">Chat</span>
        </Button>
        <CreateMeetingDialog
          onCreate={async (title, joinLink, agenda, silent, noRecording) => {
            await createMeeting(title, joinLink, agenda, silent, noRecording);
          }}
        />
      </div>
      {!loading && meetings.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            placeholder="Search calls..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sm:max-w-xs"
          />
          <div className="flex gap-1">
            {STATUS_FILTERS.map((status) => (
              <Button
                key={status}
                size="sm"
                variant={statusFilter === status ? "accent" : "outline"}
                onClick={() => setStatusFilter(status)}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      )}

      {showChat && (
        <div className="mb-6">
          <ChatPanel placeholder="Ask about any of your calls..." />
        </div>
      )}

      {pendingTasks.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ListChecks className="h-4 w-4" />
                Pending Tasks
                <span className="bg-ring ml-1 rounded-full px-2 py-0.5 text-xs text-white">
                  {pendingTasks.length}
                </span>
              </CardTitle>
              <Button
                variant="ghost"
                size="xs"
                render={<Link href="/dashboard/tasks" />}
              >
                View all
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingTasks.slice(0, 3).map((task) => (
                <div key={task.id} className="flex items-center gap-2 text-sm">
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                    onClick={() =>
                      updateTask(task.meetingId, task.id, {
                        status: "completed",
                      })
                    }
                  >
                    {task.status === "completed" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </button>
                  <span className="flex-1 truncate">{task.title}</span>
                  {task.meetingTitle && (
                    <Link
                      href={`/dashboard/call/${task.meetingId}`}
                      className="text-muted-foreground truncate text-xs hover:underline"
                    >
                      {task.meetingTitle}
                    </Link>
                  )}
                </div>
              ))}
              {pendingTasks.length > 3 && (
                <Link
                  href="/dashboard/tasks"
                  className="text-muted-foreground block text-xs hover:underline"
                >
                  +{pendingTasks.length - 3} more
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Single CRO banner: picks the right variant based on user state */}
      <TrialPromptBanner
        hasCompletedMeetings={meetings.some((m) => m.status === "completed")}
      />

      {/* Empty state for new users */}
      {!loading && meetings.length === 0 && (
        <div className="space-y-4">
          <Card className="border-ring/20">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <div className="bg-ring/10 mb-4 flex h-14 w-14 items-center justify-center rounded-full">
                <Video className="text-ring h-7 w-7" />
              </div>
              <h2 className="mb-2 text-lg font-semibold">
                Start your first call
              </h2>
              <p className="text-muted-foreground mb-6 max-w-sm text-sm">
                Paste a call link and Vernix joins your call, transcribes the
                conversation, and generates a summary with action items.
              </p>
              <CreateMeetingDialog
                onCreate={async (title, joinLink, agenda, silent) => {
                  await createMeeting(title, joinLink, agenda, silent);
                }}
              />
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                  <FileText className="text-muted-foreground h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Give the agent context</p>
                  <p className="text-muted-foreground text-xs">
                    Upload docs about your business, team, or projects
                  </p>
                </div>
                <Button
                  size="xs"
                  variant="outline"
                  render={<Link href="/dashboard/knowledge" />}
                >
                  Upload
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                  <Plug className="text-muted-foreground h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Connect your tools</p>
                  <p className="text-muted-foreground text-xs">
                    Slack, GitHub, CRM — get live data during calls
                  </p>
                </div>
                <Button
                  size="xs"
                  variant="outline"
                  render={<Link href="/dashboard/integrations" />}
                >
                  Connect
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {!loading && meetings.length === 0 ? null : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="bg-muted h-5 w-40 animate-pulse rounded-md" />
                <div className="bg-muted h-5 w-16 animate-pulse rounded-full" />
              </div>
              <div className="bg-muted mb-2 h-4 w-56 animate-pulse rounded-md" />
              <div className="bg-muted mb-4 h-3 w-32 animate-pulse rounded-md" />
              <div className="flex items-center justify-between">
                <div className="bg-muted h-3 w-24 animate-pulse rounded-md" />
                <div className="bg-muted h-7 w-20 animate-pulse rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <MeetingList
          meetings={filtered}
          emptyMessage={
            meetings.length > 0 ? "No calls match your filters" : undefined
          }
          onJoin={joinAgent}
          onStop={stopAgent}
          onDelete={deleteMeeting}
        />
      )}
    </div>
  );
}
