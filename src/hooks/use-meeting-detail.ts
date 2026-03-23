"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import type { Meeting } from "@/lib/db/schema";
import { queryKeys } from "@/lib/query-keys";

interface TranscriptSegment {
  text: string;
  speaker: string;
  timestampMs: number;
}

interface SearchResult {
  text: string;
  speaker: string;
  timestamp_ms: number;
  score: number;
}

const TRANSIENT_STATUSES = ["joining", "active", "processing"];

async function fetchMeeting(meetingId: string): Promise<Meeting> {
  const res = await fetch(`/api/meetings/${meetingId}`);
  if (!res.ok) throw new Error("Failed to load meeting");
  return res.json();
}

async function fetchTranscript(
  meetingId: string
): Promise<TranscriptSegment[]> {
  const res = await fetch(`/api/meetings/${meetingId}/transcript`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.segments;
}

export function useMeetingDetail(meetingId: string) {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const meetingQuery = useQuery({
    queryKey: queryKeys.meetings.detail(meetingId),
    queryFn: () => fetchMeeting(meetingId),
    refetchInterval: (query) => {
      const data = query.state.data as Meeting | undefined;
      if (data && TRANSIENT_STATUSES.includes(data.status)) {
        return 5000;
      }
      return false;
    },
  });

  const transcriptQuery = useQuery({
    queryKey: queryKeys.meetings.transcript(meetingId),
    queryFn: () => fetchTranscript(meetingId),
  });

  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&meetingId=${meetingId}`
      );
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      return data.results as SearchResult[];
    },
    onSuccess: (results) => setSearchResults(results),
    onError: () => toast.error("Search failed"),
  });

  const search = (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    searchMutation.mutate(query);
  };

  const clearSearch = () => setSearchResults([]);

  return {
    meeting: meetingQuery.data ?? null,
    transcript: transcriptQuery.data ?? [],
    searchResults,
    loading: meetingQuery.isLoading || transcriptQuery.isLoading,
    searching: searchMutation.isPending,
    error: meetingQuery.error?.message ?? null,
    search,
    clearSearch,
  };
}
