"use client";

import { useCallback, useEffect, useState } from "react";
import type { Meeting } from "@/lib/db/schema";

export function useMeetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMeetings = useCallback(async () => {
    try {
      const res = await fetch("/api/meetings");
      const data = await res.json();
      setMeetings(data);
    } catch (error) {
      console.error("Failed to fetch meetings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const createMeeting = async (title: string, joinLink: string) => {
    const res = await fetch("/api/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, joinLink }),
    });

    if (!res.ok) {
      throw new Error("Failed to create meeting");
    }

    const meeting = await res.json();
    setMeetings((prev) => [meeting, ...prev]);
    return meeting;
  };

  const joinAgent = async (meetingId: string) => {
    const res = await fetch("/api/agent/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meetingId }),
    });

    if (!res.ok) {
      throw new Error("Failed to join meeting");
    }

    await fetchMeetings();
  };

  const stopAgent = async (meetingId: string) => {
    const res = await fetch("/api/agent/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meetingId }),
    });

    if (!res.ok) {
      throw new Error("Failed to stop agent");
    }

    await fetchMeetings();
  };

  const deleteMeeting = async (meetingId: string) => {
    const res = await fetch(`/api/meetings/${meetingId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      throw new Error("Failed to delete meeting");
    }

    setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
  };

  return {
    meetings,
    loading,
    createMeeting,
    joinAgent,
    stopAgent,
    deleteMeeting,
    refresh: fetchMeetings,
  };
}
