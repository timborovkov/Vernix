"use client";

import { useState } from "react";
import { useMeetings } from "@/hooks/use-meetings";
import { useAllTasks } from "@/hooks/use-all-tasks";
import { useBilling } from "@/hooks/use-billing";
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
  CheckCircle2,
  Mic,
  Search,
  Zap,
  X,
} from "lucide-react";
import { PLANS, PRICING } from "@/lib/billing/constants";

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
  const { billing } = useBilling();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [dismissedNudge, setDismissedNudge] = useState(false);

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
          onCreate={async (title, joinLink, agenda, silent) => {
            await createMeeting(title, joinLink, agenda, silent);
          }}
        />
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
          <ChatPanel placeholder="Ask about any of your meetings..." />
        </div>
      )}

      {pendingTasks.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ListChecks className="h-4 w-4" />
              Pending Tasks
              <span className="bg-ring ml-1 rounded-full px-2 py-0.5 text-xs text-white">
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

      {/* Post-first-meeting upgrade nudge */}
      {!dismissedNudge &&
        billing &&
        billing.plan !== PLANS.PRO &&
        meetings.some((m) => m.status === "completed") && (
          <Card className="border-ring/20 bg-ring/5 mb-6">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="bg-ring/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                <Zap className="text-ring h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  Your first meeting is done. Unlock more with Pro.
                </p>
                <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span className="flex items-center gap-1">
                    <Mic className="h-3 w-3" />
                    Voice agent answers live
                  </span>
                  <span className="flex items-center gap-1">
                    <Search className="h-3 w-3" />
                    Cross-meeting search
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    200 queries/day
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                variant="accent"
                onClick={() => {
                  const productId =
                    process.env.NEXT_PUBLIC_POLAR_PRODUCT_ID_PRO_MONTHLY;
                  window.location.href = productId
                    ? `/api/checkout?products=${productId}`
                    : "/pricing";
                }}
              >
                Upgrade — €{PRICING[PLANS.PRO].monthly}/mo
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => setDismissedNudge(true)}
                className="text-muted-foreground shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
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
  );
}
