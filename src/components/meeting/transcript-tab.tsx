"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { formatTime } from "@/lib/format";
import { Search, Clock } from "lucide-react";
import type { TranscriptPoint } from "@/lib/vector/scroll";

interface SearchResult {
  text: string;
  speaker: string;
  timestamp_ms: number;
  score: number;
}

interface TranscriptTabProps {
  transcript: TranscriptPoint[];
  searchResults: SearchResult[];
  searching: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onSearch: (query: string) => void;
}

export function TranscriptTab({
  transcript,
  searchResults,
  searching,
  query,
  onQueryChange,
  onSearch,
}: TranscriptTabProps) {
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder="Search transcript..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
        <Button type="submit" size="sm" disabled={searching}>
          <Search className="mr-1 h-4 w-4" />
          {searching ? "Searching..." : "Search"}
        </Button>
      </form>

      {searchResults.length > 0 && (
        <div className="space-y-2">
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

      {/* Transcript Timeline */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Full Transcript</h2>
        {transcript.length === 0 ? (
          <p className="text-muted-foreground italic">
            No transcript available
          </p>
        ) : (
          <div className="max-h-[600px] space-y-3 overflow-y-auto pr-2">
            {transcript.map((segment, i) => (
              <div key={i} className="flex gap-3">
                <div className="text-muted-foreground w-12 shrink-0 pt-0.5 text-right text-xs">
                  {formatTime(segment.timestampMs)}
                </div>
                <div>
                  <span className="text-xs font-semibold tracking-wide text-blue-500 uppercase">
                    {segment.speaker}
                  </span>
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
