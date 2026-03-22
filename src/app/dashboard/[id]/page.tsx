"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useMeetingDetail } from "@/hooks/use-meeting-detail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { statusVariant } from "@/lib/meetings/constants";
import { ArrowLeft, Search, Clock, Users } from "lucide-react";

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    meeting,
    transcript,
    searchResults,
    loading,
    searching,
    error,
    search,
  } = useMeetingDetail(id);
  const [query, setQuery] = useState("");

  if (loading) {
    return (
      <div className="text-muted-foreground py-12 text-center">Loading...</div>
    );
  }

  if (!meeting) {
    return (
      <div className="text-muted-foreground py-12 text-center">
        {error ?? "Meeting not found"}
      </div>
    );
  }

  const summary = (meeting.metadata as Record<string, unknown>)?.summary as
    | string
    | undefined;
  const participants = (meeting.participants as string[]) ?? [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    search(query);
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <Link href="/dashboard">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{meeting.title}</h1>
        <Badge variant={statusVariant[meeting.status] ?? "outline"}>
          {meeting.status}
        </Badge>
      </div>

      {/* Timestamps */}
      <div className="text-muted-foreground mt-2 flex gap-4 text-sm">
        {meeting.startedAt && (
          <span>Started: {new Date(meeting.startedAt).toLocaleString()}</span>
        )}
        {meeting.endedAt && (
          <span>Ended: {new Date(meeting.endedAt).toLocaleString()}</span>
        )}
      </div>

      {/* Summary */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {meeting.status === "processing" && !summary ? (
            <p className="text-muted-foreground italic">
              Generating summary...
            </p>
          ) : summary ? (
            <p className="whitespace-pre-wrap">{summary}</p>
          ) : (
            <p className="text-muted-foreground italic">No summary available</p>
          )}
        </CardContent>
      </Card>

      {/* Participants */}
      {participants.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
            <Users className="h-4 w-4" />
            Participants
          </h2>
          <div className="flex flex-wrap gap-2">
            {participants.map((name) => (
              <Badge key={name} variant="secondary">
                {name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mt-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Search transcript..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button type="submit" size="sm" disabled={searching}>
            <Search className="mr-1 h-4 w-4" />
            {searching ? "Searching..." : "Search"}
          </Button>
        </form>

        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-medium">
              {searchResults.length} results
            </h3>
            {searchResults.map((result, i) => (
              <Card key={i}>
                <CardContent className="py-3">
                  <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs">
                    <span className="font-medium">{result.speaker}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(result.timestamp_ms)}
                    </span>
                    <span className="ml-auto">
                      Score: {result.score.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm">{result.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Transcript Timeline */}
      <div className="mt-6">
        <h2 className="mb-4 text-lg font-semibold">Transcript</h2>
        {transcript.length === 0 ? (
          <p className="text-muted-foreground italic">
            No transcript available
          </p>
        ) : (
          <div className="space-y-3">
            {transcript.map((segment, i) => (
              <div key={i} className="flex gap-3">
                <div className="text-muted-foreground w-12 shrink-0 pt-0.5 text-right text-xs">
                  {formatTime(segment.timestampMs)}
                </div>
                <div>
                  <span className="text-sm font-medium">{segment.speaker}</span>
                  <p className="text-sm">{segment.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
