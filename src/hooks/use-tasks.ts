"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Task } from "@/lib/db/schema";
import { queryKeys } from "@/lib/query-keys";
import { optimisticTaskUpdate, rollbackTaskUpdate } from "./task-cache";

async function fetchTasks(meetingId: string): Promise<Task[]> {
  const res = await fetch(`/api/meetings/${meetingId}/tasks`);
  if (!res.ok) throw new Error("Failed to load tasks");
  const data = await res.json();
  return data.tasks;
}

export function useMeetingTasks(meetingId: string) {
  const queryClient = useQueryClient();
  const qk = queryKeys.tasks.byMeeting(meetingId);

  const { data: tasks = [], isLoading: loading } = useQuery({
    queryKey: qk,
    queryFn: () => fetchTasks(meetingId),
  });

  // Invalidate all task queries (prefix match covers both byMeeting and all)
  const invalidateTasks = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });

  const addMutation = useMutation({
    mutationFn: async (params: { title: string; assignee?: string }) => {
      const res = await fetch(`/api/meetings/${meetingId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error("Failed to add task");
      return res.json();
    },
    onSuccess: invalidateTasks,
    onError: () => toast.error("Failed to add task"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      taskId,
      updates,
    }: {
      taskId: string;
      updates: Partial<Pick<Task, "title" | "status" | "assignee">>;
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
      const previousMeeting = queryClient.getQueryData<Task[]>(qk);
      // Optimistic update on per-meeting tasks
      await queryClient.cancelQueries({ queryKey: qk });
      queryClient.setQueryData<Task[]>(qk, (old) =>
        old?.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
      );
      // Optimistic update on all cross-meeting task caches
      const previousAll = await optimisticTaskUpdate(
        queryClient,
        taskId,
        updates as Record<string, unknown>
      );
      return { previousMeeting, previousAll };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousMeeting)
        queryClient.setQueryData(qk, context.previousMeeting);
      if (context?.previousAll) {
        rollbackTaskUpdate(queryClient, context.previousAll);
      }
      toast.error("Failed to update task");
    },
    onSettled: invalidateTasks,
  });

  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`/api/meetings/${meetingId}/tasks/${taskId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete task");
    },
    onSuccess: invalidateTasks,
    onError: () => toast.error("Failed to delete task"),
  });

  return {
    tasks,
    loading,
    addTask: (title: string, assignee?: string) =>
      addMutation.mutate({ title, assignee }),
    updateTask: (
      taskId: string,
      updates: Partial<Pick<Task, "title" | "status" | "assignee">>
    ) => updateMutation.mutate({ taskId, updates }),
    deleteTask: (taskId: string) => deleteMutation.mutate(taskId),
    refresh: invalidateTasks,
  };
}
