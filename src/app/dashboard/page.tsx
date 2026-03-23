"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
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
  LogOut,
  MessageSquare,
  BookOpen,
  ListChecks,
  CheckCircle2,
} from "lucide-react";

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

  const { tasks: pendingTasks } = useAllTasks();

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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">KiviKova</h1>
          <p className="text-muted-foreground">
            AI Video Call Agent — Zoom, Meet, Teams, Webex
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/dashboard/knowledge" />}
          >
            <BookOpen className="mr-1 h-4 w-4" />
            Knowledge
          </Button>
          <Button
            variant={showChat ? "default" : "outline"}
            size="sm"
            onClick={() => setShowChat(!showChat)}
          >
            <MessageSquare className="mr-1 h-4 w-4" />
            Chat
          </Button>
          <CreateMeetingDialog
            onCreate={async (title, joinLink, agenda) => {
              await createMeeting(title, joinLink, agenda);
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!loading && meetings.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            placeholder="Search meetings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sm:max-w-xs"
          />
          <div className="flex gap-1">
            {STATUS_FILTERS.map((status) => (
              <Button
                key={status}
                size="sm"
                variant={statusFilter === status ? "default" : "outline"}
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
          <ChatPanel placeholder="Ask about any of your meetings..." />
        </div>
      )}

      {pendingTasks.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ListChecks className="h-4 w-4" />
              Pending Tasks
              <span className="bg-primary text-primary-foreground ml-1 rounded-full px-2 py-0.5 text-xs">
                {pendingTasks.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingTasks.slice(0, 10).map((task) => (
                <div key={task.id} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="text-muted-foreground h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{task.title}</span>
                  {task.meetingTitle && (
                    <Link
                      href={`/dashboard/${task.meetingId}`}
                      className="text-muted-foreground truncate text-xs hover:underline"
                    >
                      {task.meetingTitle}
                    </Link>
                  )}
                </div>
              ))}
              {pendingTasks.length > 10 && (
                <p className="text-muted-foreground text-xs">
                  +{pendingTasks.length - 10} more
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-muted-foreground py-12 text-center">
          Loading meetings...
        </div>
      ) : (
        <MeetingList
          meetings={filtered}
          emptyMessage={
            meetings.length > 0 ? "No meetings match your filters" : undefined
          }
          onJoin={joinAgent}
          onStop={stopAgent}
          onDelete={deleteMeeting}
        />
      )}
    </div>
  );
}
