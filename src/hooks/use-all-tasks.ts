"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { optimisticTaskUpdate, rollbackTaskUpdate } from "./task-cache";

export interface TaskWithMeeting {
  id: string;
  meetingId: string;
  title: string;
  assignee: string | null;
  status: string;
  sourceText: string | null;
  sourceTimestampMs: number | null;
  dueDate: string | null;
  createdAt: string;
  meetingTitle: string | null;
}

async function fetchAllTasks(status?: string): Promise<TaskWithMeeting[]> {
  const params = status ? `?status=${status}` : "";
  const res = await fetch(`/api/tasks${params}`);
  if (!res.ok) throw new Error("Failed to load tasks");
  const data = await res.json();
  return data.tasks;
}

export function useAllTasks(status?: "open" | "completed") {
  const queryClient = useQueryClient();
  const queryKey = status
    ? [...queryKeys.tasks.all, status]
    : queryKeys.tasks.all;

  const { data: tasks = [], isLoading: loading } = useQuery({
    queryKey,
    queryFn: () => fetchAllTasks(status),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      meetingId,
      taskId,
      updates,
    }: {
      meetingId: string;
      taskId: string;
      updates: { status?: string; title?: string; assignee?: string | null };
    }) => {
      const res = await fetch(`/api/meetings/${meetingId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update task");
      return res.json();
    },
    onMutate: async ({ taskId, updates }) => {
      const previousData = await optimisticTaskUpdate(
        queryClient,
        taskId,
        updates
      );
      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        rollbackTaskUpdate(queryClient, context.previousData);
      }
      toast.error("Failed to update task");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });

  return {
    tasks,
    loading,
    updateTask: (
      meetingId: string,
      taskId: string,
      updates: { status?: string; title?: string; assignee?: string | null }
    ) => updateMutation.mutate({ meetingId, taskId, updates }),
    refresh: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all }),
  };
}
