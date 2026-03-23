"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

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

async function fetchAllTasks(): Promise<TaskWithMeeting[]> {
  const res = await fetch("/api/tasks?status=open");
  if (!res.ok) return [];
  const data = await res.json();
  return data.tasks;
}

export function useAllTasks() {
  const queryClient = useQueryClient();
  const { data: tasks = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.tasks.all,
    queryFn: fetchAllTasks,
  });

  return {
    tasks,
    loading,
    refresh: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all }),
  };
}
