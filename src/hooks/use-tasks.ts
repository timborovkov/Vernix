"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Task } from "@/lib/db/schema";

export function useMeetingTasks(meetingId: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/meetings/${meetingId}/tasks`);
      if (!res.ok) return;
      const data = await res.json();
      setTasks(data.tasks);
    } catch {
      // Silent — tasks are supplementary
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = async (title: string, assignee?: string) => {
    try {
      const res = await fetch(`/api/meetings/${meetingId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, assignee }),
      });
      if (!res.ok) {
        toast.error("Failed to add task");
        return;
      }
      const task = await res.json();
      setTasks((prev) => [task, ...prev]);
    } catch {
      toast.error("Failed to add task");
    }
  };

  const updateTask = async (
    taskId: string,
    updates: { title?: string; status?: string; assignee?: string }
  ) => {
    try {
      const res = await fetch(`/api/meetings/${meetingId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        toast.error("Failed to update task");
        return;
      }
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    } catch {
      toast.error("Failed to update task");
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/meetings/${meetingId}/tasks/${taskId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Failed to delete task");
        return;
      }
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch {
      toast.error("Failed to delete task");
    }
  };

  return {
    tasks,
    loading,
    addTask,
    updateTask,
    deleteTask,
    refresh: fetchTasks,
  };
}
