"use client";

import Link from "next/link";
import { Video, Mic, FileText, Clock, Plug } from "lucide-react";
import { MeetingCard } from "./meeting-card";
import { useBilling } from "@/hooks/use-billing";
import { Badge } from "@/components/ui/badge";
import { DISPLAY, LIMITS, PLANS } from "@/lib/billing/constants";
import type { Meeting } from "@/lib/db/schema";

interface MeetingListProps {
  meetings: Meeting[];
  emptyMessage?: string;
  onJoin: (id: string) => Promise<void>;
  onStop: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function TrialEmptyState() {
  const { billing } = useBilling();

  if (!billing) {
    return (
      <div className="text-muted-foreground py-12 text-center">
        <Video className="mx-auto mb-3 h-12 w-12 opacity-40" />
        <p className="text-lg font-medium">No meetings yet</p>
        <p className="text-sm">
          Create a meeting to get started with your AI agent.
        </p>
      </div>
    );
  }

  const isTrialing = billing.trialing && billing.trialDaysRemaining > 0;

  if (isTrialing) {
    return (
      <div className="py-12 text-center">
        <div className="bg-ring/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
          <Mic className="text-ring h-8 w-8" />
        </div>
        <Badge variant="secondary" className="mb-3">
          Pro trial: {billing.trialDaysRemaining} days left
        </Badge>
        <p className="text-lg font-medium">
          Your AI assistant is ready for calls
        </p>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
          Click &quot;New Meeting&quot; and paste a Zoom, Meet, Teams, or Webex
          link. Vernix joins, connects to your tools, and answers questions with
          real data during the call.
        </p>
        <div className="text-muted-foreground mx-auto mt-6 grid max-w-lg gap-3 text-left text-sm sm:grid-cols-3">
          <div className="flex items-start gap-2">
            <Plug className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Connects to your tools for live data</span>
          </div>
          <div className="flex items-start gap-2">
            <Mic className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Answers and takes action during calls</span>
          </div>
          <div className="flex items-start gap-2">
            <FileText className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Summaries, tasks, and searchable transcripts</span>
          </div>
        </div>
        <p className="text-muted-foreground mt-6 text-xs">
          <Clock className="mr-1 inline h-3 w-3" />
          {DISPLAY.trialMinutes} minutes of meeting time included in your trial
        </p>
      </div>
    );
  }

  // Free plan (no trial or trial expired)
  return (
    <div className="py-12 text-center">
      <Video className="text-muted-foreground mx-auto mb-3 h-12 w-12 opacity-40" />
      <p className="text-lg font-medium">No meetings yet</p>
      <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm">
        Create a meeting to get started. Vernix joins your call, transcribes
        everything, and generates summaries.
      </p>
      <p className="text-muted-foreground mt-4 text-xs">
        Free plan includes {LIMITS[PLANS.FREE].meetingMinutesPerMonth} minutes
        of silent meetings.{" "}
        <Link href="/pricing" className="underline underline-offset-2">
          Start a Pro trial to connect your tools and unlock voice
        </Link>
      </p>
    </div>
  );
}

export function MeetingList({
  meetings,
  emptyMessage,
  onJoin,
  onStop,
  onDelete,
}: MeetingListProps) {
  if (meetings.length === 0) {
    if (emptyMessage) {
      return (
        <div className="text-muted-foreground py-12 text-center">
          <Video className="mx-auto mb-3 h-12 w-12 opacity-40" />
          <p className="text-lg font-medium">{emptyMessage}</p>
        </div>
      );
    }
    return <TrialEmptyState />;
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
