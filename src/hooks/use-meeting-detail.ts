"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Meeting } from "@/lib/db/schema";

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

export function useMeetingDetail(meetingId: string) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMeeting = useCallback(async () => {
    const res = await fetch(`/api/meetings/${meetingId}`);
    if (res.ok) {
      setMeeting(await res.json());
    } else {
      setError("Failed to load meeting");
    }
  }, [meetingId]);

  const fetchTranscript = useCallback(async () => {
    const res = await fetch(`/api/meetings/${meetingId}/transcript`);
    if (res.ok) {
      const data = await res.json();
      setTranscript(data.segments);
    }
  }, [meetingId]);

  useEffect(() => {
    Promise.all([fetchMeeting(), fetchTranscript()]).finally(() =>
      setLoading(false)
    );
  }, [fetchMeeting, fetchTranscript]);

  // Poll when meeting is in a transient status
  useEffect(() => {
    if (!meeting) return;
    const transient = ["joining", "active", "processing"].includes(
      meeting.status
    );
    if (!transient) return;

    const interval = setInterval(fetchMeeting, 5000);
    return () => clearInterval(interval);
  }, [meeting, fetchMeeting]);

  const search = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&meetingId=${meetingId}`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results);
        } else {
          toast.error("Search failed");
        }
      } finally {
        setSearching(false);
      }
    },
    [meetingId]
  );

  const clearSearch = useCallback(() => {
    setSearchResults([]);
  }, []);

  return {
    meeting,
    transcript,
    searchResults,
    loading,
    searching,
    error,
    search,
    clearSearch,
  };
}
