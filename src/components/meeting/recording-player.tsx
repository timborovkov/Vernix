"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Video } from "lucide-react";

interface RecordingPlayerProps {
  meetingId: string;
  hasRecording: boolean;
}

export function RecordingPlayer({
  meetingId,
  hasRecording,
}: RecordingPlayerProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!hasRecording) return;
    fetch(`/api/meetings/${meetingId}/recording`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.url) setUrl(data.url);
        else setError(true);
      })
      .catch(() => setError(true));
  }, [meetingId, hasRecording]);

  if (!hasRecording || error) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Video className="h-4 w-4" />
          Recording
        </CardTitle>
      </CardHeader>
      <CardContent>
        {url ? (
          <video
            src={url}
            controls
            className="w-full rounded-lg"
            preload="metadata"
          />
        ) : (
          <div className="bg-muted flex h-48 items-center justify-center rounded-lg">
            <p className="text-muted-foreground text-sm">
              Loading recording...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
