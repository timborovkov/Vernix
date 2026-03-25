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
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LogOut,
  MessageSquare,
  BookOpen,
  ListChecks,
  CheckCircle2,
  Settings,
  Download,
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
    <>
      {/* Sticky header */}
      <header className="border-border bg-background/80 sticky top-0 z-50 border-b backdrop-blur-sm">
        <div className="container mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/brand/icon/icon.svg"
              alt=""
              width={24}
              height={24}
              className="dark:hidden"
            />
            <Image
              src="/brand/icon/icon-dark.png"
              alt=""
              width={24}
              height={24}
              className="hidden dark:block"
            />
            <Image
              src="/brand/wordmark/wordmark-nobg.png"
              alt="Vernix"
              width={80}
              height={24}
              className="dark:hidden"
            />
            <Image
              src="/brand/wordmark/wordmark-dark.png"
              alt="Vernix"
              width={80}
              height={24}
              className="hidden dark:block"
            />
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/dashboard/knowledge" />}
            >
              <BookOpen className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">Knowledge</span>
            </Button>
            <Button
              variant={showChat ? "default" : "outline"}
              size="sm"
              onClick={() => setShowChat(!showChat)}
            >
              <MessageSquare className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">Chat</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              render={<a href="/api/export" />}
            >
              <Download className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">Export All</span>
            </Button>
            <CreateMeetingDialog
              onCreate={async (title, joinLink, agenda, silent) => {
                await createMeeting(title, joinLink, agenda, silent);
              }}
            />
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/dashboard/settings" />}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-6xl px-4 py-8">
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
                  <div
                    key={task.id}
                    className="flex items-center gap-2 text-sm"
                  >
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
              meetings.length > 0 ? "No meetings match your filters" : undefined
            }
            onJoin={joinAgent}
            onStop={stopAgent}
            onDelete={deleteMeeting}
          />
        )}
      </div>
    </>
  );
}
