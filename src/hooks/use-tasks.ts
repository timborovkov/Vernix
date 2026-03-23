"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Task } from "@/lib/db/schema";
import { queryKeys } from "@/lib/query-keys";

async function fetchTasks(meetingId: string): Promise<Task[]> {
  const res = await fetch(`/api/meetings/${meetingId}/tasks`);
  if (!res.ok) return [];
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
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
      await queryClient.cancelQueries({ queryKey: qk });
      const previous = queryClient.getQueryData<Task[]>(qk);
      queryClient.setQueryData<Task[]>(qk, (old) =>
        old?.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(qk, context.previous);
      toast.error("Failed to update task");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qk });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`/api/meetings/${meetingId}/tasks/${taskId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete task");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
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
    refresh: () => queryClient.invalidateQueries({ queryKey: qk }),
  };
}
