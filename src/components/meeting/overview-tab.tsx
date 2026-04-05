"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Markdown } from "@/components/markdown";
import { RecordingPlayer } from "./recording-player";
import {
  Save,
  Users,
  VolumeX,
  Volume2,
  OctagonX,
  ExternalLink,
  RefreshCw,
  Wrench,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Meeting } from "@/lib/db/schema";

interface OverviewTabProps {
  meeting: Meeting;
  agenda: string;
  onAgendaChange: (value: string) => void;
}

export function OverviewTab({
  meeting,
  agenda,
  onAgendaChange,
}: OverviewTabProps) {
  const queryClient = useQueryClient();
  const [agendaSaving, setAgendaSaving] = useState(false);
  const [silentSaving, setSilentSaving] = useState(false);
  const [muteSaving, setMuteSaving] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [toolLogExpanded, setToolLogExpanded] = useState(false);

  const metadata = (meeting.metadata ?? {}) as Record<string, unknown>;
  const summary = metadata.summary as string | undefined;
  const isSilent = Boolean(metadata.silent);
  const isMuted = Boolean(metadata.muted);
  const voiceActivation = metadata.voiceActivation as
    | { state?: string }
    | undefined;
  const voiceTelemetry = metadata.voiceTelemetry as
    | {
        activationCount?: number;
        totalConnectedSeconds?: number;
        avgSessionSeconds?: number;
      }
    | undefined;
  const participants = (meeting.participants as string[]) ?? [];
  const participantEvents = metadata.participantEvents as
    | Array<{
        name: string | null;
        email?: string | null;
        isHost?: boolean;
      }>
    | undefined;
  const participantEventEntries =
    participantEvents?.filter(
      (p): p is { name: string; email?: string | null; isHost?: boolean } =>
        Boolean(p.name)
    ) ?? [];
  const visibleParticipantEvents =
    participantEventEntries.length > 0 ? participantEventEntries : undefined;
  const visibleParticipants = visibleParticipantEvents
    ? visibleParticipantEvents
    : participants;
  const toolCallLog = metadata.toolCallLog as
    | Array<{
        timestamp: number;
        toolName: string;
        args?: Record<string, unknown>;
        result?: string;
        durationMs: number;
        source: "voice" | "silent";
      }>
    | undefined;
  const isEditable =
    meeting.status === "pending" ||
    meeting.status === "joining" ||
    meeting.status === "failed";

  const saveAgenda = async () => {
    setAgendaSaving(true);
    try {
      const res = await fetch(`/api/meetings/${meeting.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agenda }),
      });
      if (!res.ok) throw new Error();
      toast.success("Agenda saved");
    } catch {
      toast.error("Failed to save agenda");
    } finally {
      setAgendaSaving(false);
    }
  };

  const toggleMute = async () => {
    setMuteSaving(true);
    try {
      const res = await fetch(`/api/meetings/${meeting.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ muted: !isMuted }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Agent ${!isMuted ? "muted" : "unmuted"}`);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.meetings.detail(meeting.id),
      });
    } catch {
      toast.error("Failed to update mute state");
    } finally {
      setMuteSaving(false);
    }
  };

  const handleStopAgent = async () => {
    setStopping(true);
    try {
      const res = await fetch("/api/agent/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId: meeting.id }),
      });
      if (!res.ok) throw new Error();
      toast.success("Agent stopped");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.meetings.detail(meeting.id),
      });
    } catch {
      toast.error("Failed to stop agent");
    } finally {
      setStopping(false);
    }
  };

  const toggleSilent = async () => {
    setSilentSaving(true);
    try {
      const res = await fetch(`/api/meetings/${meeting.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ silent: !isSilent }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Silent mode ${!isSilent ? "enabled" : "disabled"}`);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.meetings.detail(meeting.id),
      });
    } catch {
      toast.error("Failed to update silent mode");
    } finally {
      setSilentSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Meeting Link */}
      {meeting.joinLink && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(meeting.joinLink, "_blank", "noopener")}
        >
          <ExternalLink className="mr-1 h-3.5 w-3.5" />
          Open Call Link
        </Button>
      )}

      {/* Agent Controls */}
      {meeting.status === "active" && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30">
          <CardContent className="flex flex-wrap items-center gap-3 py-3">
            <span className="text-sm font-medium">Agent Controls</span>
            {!isSilent && voiceActivation?.state && (
              <Badge
                variant={
                  voiceActivation.state === "responding"
                    ? "default"
                    : voiceActivation.state === "activated"
                      ? "secondary"
                      : "outline"
                }
              >
                {voiceActivation.state === "idle" && "Listening"}
                {voiceActivation.state === "activated" && "Activating"}
                {voiceActivation.state === "responding" && "Responding"}
                {voiceActivation.state === "cooldown" && "Cooling down"}
              </Badge>
            )}
            <Button
              variant={isMuted ? "default" : "outline"}
              size="sm"
              onClick={toggleMute}
              disabled={muteSaving}
            >
              {isMuted ? (
                <VolumeX className="mr-1 h-3.5 w-3.5" />
              ) : (
                <Volume2 className="mr-1 h-3.5 w-3.5" />
              )}
              {muteSaving
                ? "Saving..."
                : isMuted
                  ? "Unmute Agent"
                  : "Mute Agent"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleStopAgent}
              disabled={stopping}
            >
              <OctagonX className="mr-1 h-3.5 w-3.5" />
              {stopping ? "Stopping..." : "Stop Agent"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Agenda */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Agenda</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={agenda}
            onChange={(e) => onAgendaChange(e.target.value)}
            placeholder="Call goals, topics to discuss, prep notes..."
            rows={3}
            disabled={!isEditable}
            className="border-input bg-background placeholder:text-muted-foreground w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
          />
          {isEditable && (
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <Button size="sm" onClick={saveAgenda} disabled={agendaSaving}>
                <Save className="mr-1 h-3 w-3" />
                {agendaSaving ? "Saving..." : "Save Agenda"}
              </Button>
              {(meeting.status === "pending" ||
                meeting.status === "failed") && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="silent-mode"
                    checked={isSilent}
                    onChange={toggleSilent}
                    disabled={silentSaving}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="silent-mode" className="cursor-pointer">
                    Silent Mode
                  </Label>
                  <span className="text-muted-foreground text-xs">
                    Text-only — responds via call chat, no voice
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {meeting.status === "processing" && !summary ? (
            <p className="text-muted-foreground italic">
              Generating summary...
            </p>
          ) : summary ? (
            <Markdown>{summary}</Markdown>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-muted-foreground italic">
                No summary available
              </p>
              {meeting.status === "completed" && (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={async () => {
                    try {
                      const res = await fetch(
                        `/api/meetings/${meeting.id}/summarize`,
                        { method: "POST" }
                      );
                      if (res.ok) {
                        toast.success("Summary generation started");
                        await queryClient.invalidateQueries({
                          queryKey: queryKeys.meetings.detail(meeting.id),
                        });
                      } else {
                        toast.error("Failed to generate summary");
                      }
                    } catch {
                      toast.error("Failed to generate summary");
                    }
                  }}
                >
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Re-generate
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recording */}
      <RecordingPlayer
        meetingId={meeting.id}
        hasRecording={!!metadata.recordingKey}
      />

      {/* Voice Telemetry */}
      {voiceTelemetry &&
        voiceTelemetry.activationCount != null &&
        voiceTelemetry.activationCount > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Voice Agent Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <span className="text-muted-foreground">Activations:</span>{" "}
                  <span className="font-medium">
                    {voiceTelemetry.activationCount}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Connected time:</span>{" "}
                  <span className="font-medium">
                    {voiceTelemetry.totalConnectedSeconds}s
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Avg session:</span>{" "}
                  <span className="font-medium">
                    {voiceTelemetry.avgSessionSeconds}s
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Participants */}
      {visibleParticipants.length > 0 && (
        <div>
          <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
            <Users className="h-4 w-4" />
            Participants
          </h2>
          <div className="flex flex-wrap gap-2">
            {visibleParticipantEvents
              ? visibleParticipantEvents.map((p) => (
                  <Badge
                    key={p.name}
                    variant={p.isHost ? "default" : "secondary"}
                    title={
                      [p.isHost && "Host", p.email]
                        .filter(Boolean)
                        .join(" · ") || undefined
                    }
                  >
                    {p.name}
                    {p.isHost && (
                      <span className="ml-1 text-[10px] opacity-70">host</span>
                    )}
                  </Badge>
                ))
              : participants.map((name) => (
                  <Badge key={name} variant="secondary">
                    {name}
                  </Badge>
                ))}
          </div>
        </div>
      )}

      {/* Tool Call Log */}
      {toolCallLog && toolCallLog.length > 0 && (
        <Card>
          <CardHeader
            className="cursor-pointer"
            onClick={() => setToolLogExpanded(!toolLogExpanded)}
          >
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wrench className="h-4 w-4" />
              Tool Calls
              <Badge variant="secondary" className="ml-1">
                {toolCallLog.length}
              </Badge>
              <span className="ml-auto">
                {toolLogExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </span>
            </CardTitle>
          </CardHeader>
          {toolLogExpanded && (
            <CardContent>
              <div className="space-y-2">
                {toolCallLog.map((entry, i) => (
                  <div
                    key={i}
                    className="bg-muted/50 rounded-md px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {entry.toolName.replace(/_/g, " ")}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {entry.source}
                      </Badge>
                      <span className="text-muted-foreground ml-auto text-xs">
                        {entry.durationMs}ms
                      </span>
                    </div>
                    {entry.args && Object.keys(entry.args).length > 0 && (
                      <pre className="text-muted-foreground mt-1 text-xs">
                        {JSON.stringify(entry.args, null, 2)}
                      </pre>
                    )}
                    {entry.result && (
                      <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                        {entry.result}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
