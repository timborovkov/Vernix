"use client";

import { useCallback, useEffect, useState } from "react";

interface TaskWithMeeting {
  id: string;
  meetingId: string;
  title: string;
  assignee: string | null;
  status: string;
  dueDate: string | null;
  createdAt: string;
  meetingTitle: string | null;
}

export function useAllTasks() {
  const [tasks, setTasks] = useState<TaskWithMeeting[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks?status=open");
      if (!res.ok) return;
      const data = await res.json();
      setTasks(data.tasks);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, loading, refresh: fetchTasks };
}
