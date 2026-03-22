"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { Meeting } from "@/lib/db/schema";
import { statusVariant } from "@/lib/meetings/constants";
import Link from "next/link";
import { Play, Square, Trash2 } from "lucide-react";

interface MeetingCardProps {
  meeting: Meeting;
  onJoin: (id: string) => Promise<void>;
  onStop: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function MeetingCard({
  meeting,
  onJoin,
  onStop,
  onDelete,
}: MeetingCardProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmStop, setConfirmStop] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canJoin = meeting.status === "pending" || meeting.status === "failed";
  const canStop =
    meeting.status === "active" ||
    meeting.status === "joining" ||
    meeting.status === "processing";

  async function handleAction(action: () => Promise<void>, key: string) {
    setActionLoading(key);
    try {
      await action();
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <CardTitle className="text-lg">
            <Link href={`/dashboard/${meeting.id}`} className="hover:underline">
              {meeting.title}
            </Link>
          </CardTitle>
          <Badge variant={statusVariant[meeting.status] ?? "outline"}>
            {meeting.status}
          </Badge>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground truncate text-sm">
            {meeting.joinLink}
          </p>
          {meeting.startedAt && (
            <p className="text-muted-foreground mt-1 text-xs">
              Started: {new Date(meeting.startedAt).toLocaleString()}
            </p>
          )}
          {meeting.endedAt && (
            <p className="text-muted-foreground text-xs">
              Ended: {new Date(meeting.endedAt).toLocaleString()}
            </p>
          )}
        </CardContent>
        <CardFooter className="gap-2">
          {canJoin && (
            <Button
              size="sm"
              disabled={!!actionLoading}
              onClick={() => handleAction(() => onJoin(meeting.id), "join")}
            >
              <Play className="mr-1 h-3 w-3" />
              {actionLoading === "join" ? "Joining..." : "Join Agent"}
            </Button>
          )}
          {canStop && (
            <Button
              size="sm"
              variant="secondary"
              disabled={!!actionLoading}
              onClick={() => setConfirmStop(true)}
            >
              <Square className="mr-1 h-3 w-3" />
              {actionLoading === "stop" ? "Stopping..." : "Stop"}
            </Button>
          )}
          <Button
            size="sm"
            variant="destructive"
            disabled={!!actionLoading}
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </CardFooter>
      </Card>

      <ConfirmDialog
        open={confirmStop}
        onOpenChange={setConfirmStop}
        title="Stop meeting agent?"
        description="Summary will be generated after stopping."
        confirmLabel="Stop"
        onConfirm={() => {
          setConfirmStop(false);
          handleAction(() => onStop(meeting.id), "stop");
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this meeting?"
        description="This will also remove all transcript data. This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          setConfirmDelete(false);
          handleAction(() => onDelete(meeting.id), "delete");
        }}
      />
    </>
  );
}
