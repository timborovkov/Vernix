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
import { Play, Square, Trash2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/date";
import { useTimezone } from "@/hooks/use-timezone";
import { isBillingError } from "@/lib/billing/errors";
import {
  UpgradeDialog,
  detectPaywallTrigger,
  type PaywallTrigger,
} from "@/components/upgrade-dialog";

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
  const timezone = useTimezone();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmStop, setConfirmStop] = useState(false);
  const [paywallTrigger, setPaywallTrigger] = useState<PaywallTrigger | null>(
    null
  );
  const [paywallMessage, setPaywallMessage] = useState<string>("");
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
    } catch (error) {
      if (isBillingError(error)) {
        const trigger = detectPaywallTrigger(
          error.message,
          error.isFeatureGate
        );
        setPaywallTrigger(trigger);
        setPaywallMessage(error.message);
      } else {
        const msg =
          error instanceof Error ? error.message : "Something went wrong";
        toast.error(msg);
      }
    } finally {
      setActionLoading(null);
    }
  }

  const isSilent = Boolean(
    (meeting.metadata as Record<string, unknown>)?.silent
  );
  const isMuted = Boolean((meeting.metadata as Record<string, unknown>)?.muted);

  return (
    <>
      <Card className="flex h-full flex-col">
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <CardTitle className="text-lg">
            <Link
              href={`/dashboard/call/${meeting.id}`}
              className="hover:underline"
            >
              {meeting.title}
            </Link>
          </CardTitle>
          <div className="flex items-center gap-1">
            {isMuted && meeting.status === "active" && (
              <VolumeX className="text-muted-foreground h-4 w-4" />
            )}
            {isSilent && <Badge variant="secondary">Silent</Badge>}
            <Badge variant={statusVariant[meeting.status] ?? "outline"}>
              {meeting.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <a
            href={meeting.joinLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground block truncate text-sm hover:underline"
          >
            {meeting.joinLink}
          </a>
          {meeting.startedAt && (
            <p className="text-muted-foreground mt-1 text-xs">
              Started: {formatDateTime(meeting.startedAt, timezone)}
            </p>
          )}
          {meeting.endedAt && (
            <p className="text-muted-foreground text-xs">
              Ended: {formatDateTime(meeting.endedAt, timezone)}
            </p>
          )}
          {meeting.status === "active" && (
            <p className="mt-2 text-xs text-green-600">
              {isSilent
                ? "Text agent responds via call chat when called: Vernix"
                : "Voice agent responds to: Vernix, Agent, Assistant"}
            </p>
          )}
        </CardContent>
        <CardFooter className="mt-auto gap-2">
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
            size="icon-sm"
            variant="ghost"
            disabled={!!actionLoading}
            onClick={() => setConfirmDelete(true)}
            className="text-muted-foreground hover:text-destructive ml-auto"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </CardFooter>
      </Card>

      <ConfirmDialog
        open={confirmStop}
        onOpenChange={setConfirmStop}
        title="Stop call agent?"
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
        title="Delete this call?"
        description="This will also remove all transcript data. This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          setConfirmDelete(false);
          handleAction(() => onDelete(meeting.id), "delete");
        }}
      />

      {paywallTrigger && (
        <UpgradeDialog
          open
          onOpenChange={(v) => !v && setPaywallTrigger(null)}
          trigger={paywallTrigger}
          errorMessage={paywallMessage}
        />
      )}
    </>
  );
}
