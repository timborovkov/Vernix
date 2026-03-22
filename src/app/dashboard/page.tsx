"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useMeetings } from "@/hooks/use-meetings";
import { MeetingList } from "@/components/meeting-list";
import { CreateMeetingDialog } from "@/components/create-meeting-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogOut } from "lucide-react";

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

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

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
          <p className="text-muted-foreground">AI Video Call Agent</p>
        </div>
        <div className="flex items-center gap-2">
          <CreateMeetingDialog
            onCreate={async (title, joinLink) => {
              await createMeeting(title, joinLink);
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
