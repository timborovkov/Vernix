"use client";

import { Video } from "lucide-react";
import { MeetingCard } from "./meeting-card";
import type { Meeting } from "@/lib/db/schema";

interface MeetingListProps {
  meetings: Meeting[];
  emptyMessage?: string;
  onJoin: (id: string) => Promise<void>;
  onStop: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function MeetingList({
  meetings,
  emptyMessage,
  onJoin,
  onStop,
  onDelete,
}: MeetingListProps) {
  if (meetings.length === 0) {
    return (
      <div className="text-muted-foreground py-12 text-center">
        <Video className="mx-auto mb-3 h-12 w-12 opacity-40" />
        <p className="text-lg font-medium">
          {emptyMessage ?? "No meetings yet"}
        </p>
        {!emptyMessage && (
          <p className="text-sm">
            Create a meeting to get started with your AI agent.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {meetings.map((meeting) => (
        <MeetingCard
          key={meeting.id}
          meeting={meeting}
          onJoin={onJoin}
          onStop={onStop}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
