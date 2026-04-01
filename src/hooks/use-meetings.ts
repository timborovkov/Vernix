"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Meeting } from "@/lib/db/schema";
import { queryKeys } from "@/lib/query-keys";
import { throwIfBillingError, BillingApiError } from "@/lib/billing/errors";

const TRANSIENT_STATUSES = ["joining", "active", "processing"];

async function fetchMeetings(): Promise<Meeting[]> {
  const res = await fetch("/api/meetings");
  if (!res.ok) throw new Error("Failed to load meetings");
  return res.json();
}

export function useMeetings() {
  const queryClient = useQueryClient();

  const { data: meetings = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.meetings.all,
    queryFn: fetchMeetings,
    meta: { errorMessage: "Failed to load meetings" },
    staleTime: 10_000,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (
        Array.isArray(data) &&
        data.some((m: Meeting) => TRANSIENT_STATUSES.includes(m.status))
      ) {
        return 5000;
      }
      return false;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (params: {
      title: string;
      joinLink: string;
      agenda?: string;
      silent?: boolean;
      noRecording?: boolean;
    }) => {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        await throwIfBillingError(res);
        throw new Error("Failed to create meeting");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.meetings.all });
      toast.success("Meeting created");
    },
  });

  const joinMutation = useMutation({
    mutationFn: async (meetingId: string) => {
      const res = await fetch("/api/agent/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId }),
      });
      if (!res.ok) {
        await throwIfBillingError(res);
        throw new Error("Failed to join meeting");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.meetings.all });
    },
    onError: (err) => {
      if (!(err instanceof BillingApiError)) {
        toast.error("Failed to join meeting");
      }
    },
  });

  const stopMutation = useMutation({
    mutationFn: async (meetingId: string) => {
      const res = await fetch("/api/agent/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId }),
      });
      if (!res.ok) throw new Error("Failed to stop agent");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.meetings.all });
    },
    onError: () => toast.error("Failed to stop agent"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (meetingId: string) => {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete meeting");
    },
    onMutate: async (meetingId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.meetings.all });
      const previous = queryClient.getQueryData<Meeting[]>(
        queryKeys.meetings.all
      );
      queryClient.setQueryData<Meeting[]>(queryKeys.meetings.all, (old) =>
        old?.filter((m) => m.id !== meetingId)
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous)
        queryClient.setQueryData(queryKeys.meetings.all, context.previous);
      toast.error("Failed to delete meeting");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.meetings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });

  const createMeeting = async (
    title: string,
    joinLink: string,
    agenda?: string,
    silent?: boolean,
    noRecording?: boolean
  ) => {
    return createMutation.mutateAsync({
      title,
      joinLink,
      agenda,
      silent,
      noRecording,
    });
  };

  return {
    meetings,
    loading,
    createMeeting,
    joinAgent: async (meetingId: string) => {
      await joinMutation.mutateAsync(meetingId).catch((e) => {
        if (e instanceof BillingApiError) throw e;
      });
    },
    stopAgent: async (meetingId: string) => {
      await stopMutation.mutateAsync(meetingId).catch(() => {});
    },
    deleteMeeting: async (meetingId: string) => {
      await deleteMutation.mutateAsync(meetingId).catch(() => {});
    },
    refresh: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.meetings.all }),
  };
}
