"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Meeting } from "@/lib/db/schema";

export function useMeetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMeetings = useCallback(async () => {
    try {
      const res = await fetch("/api/meetings");
      const data = await res.json();
      setMeetings(data);
    } catch {
      toast.error("Failed to load meetings", { id: "fetch-meetings-error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  // Poll when any meeting is in a transient status
  useEffect(() => {
    const hasTransient = meetings.some((m) =>
      ["joining", "active", "processing"].includes(m.status)
    );
    if (!hasTransient) return;

    const interval = setInterval(fetchMeetings, 5000);
    return () => clearInterval(interval);
  }, [meetings, fetchMeetings]);

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
    toast.success("Meeting created");
    return meeting;
  };

  const joinAgent = async (meetingId: string) => {
    const res = await fetch("/api/agent/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meetingId }),
    });

    if (!res.ok) {
      toast.error("Failed to join meeting");
      return;
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
      toast.error("Failed to stop agent");
      return;
    }

    await fetchMeetings();
  };

  const deleteMeeting = async (meetingId: string) => {
    const res = await fetch(`/api/meetings/${meetingId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      toast.error("Failed to delete meeting");
      return;
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
