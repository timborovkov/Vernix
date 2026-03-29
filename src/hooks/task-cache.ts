import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

/**
 * Optimistically update all task caches (prefix-matched).
 * For filtered caches (e.g. ["tasks","open"]), removes tasks whose status
 * no longer matches the filter after the update.
 *
 * Returns previous cache data for rollback.
 */
export async function optimisticTaskUpdate(
  queryClient: QueryClient,
  taskId: string,
  updates: Record<string, unknown>
): Promise<Array<[readonly unknown[], unknown]>> {
  await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all });

  const allQueries = queryClient.getQueriesData({
    queryKey: queryKeys.tasks.all,
  });
  // Exclude per-meeting caches (["tasks","meeting",id]) — those are managed by useMeetingTasks
  const previousData = allQueries.filter(
    ([key]) => !(key.length >= 2 && key[1] === "meeting")
  );

  for (const [key] of previousData) {
    queryClient.setQueryData(key, (old: unknown) => {
      if (!Array.isArray(old)) return old;
      const updated = old.map((t: Record<string, unknown>) =>
        t.id === taskId ? { ...t, ...updates } : t
      );
      // If this cache has a status filter suffix, remove non-matching tasks
      const filterStatus = key.length > 1 ? key[key.length - 1] : null;
      if (
        updates.status &&
        typeof filterStatus === "string" &&
        (filterStatus === "open" || filterStatus === "completed")
      ) {
        return updated.filter(
          (t: Record<string, unknown>) => t.status === filterStatus
        );
      }
      return updated;
    });
  }

  return previousData;
}

/**
 * Rollback task caches to previous state.
 */
export function rollbackTaskUpdate(
  queryClient: QueryClient,
  previousData: Array<[readonly unknown[], unknown]>
): void {
  for (const [key, data] of previousData) {
    queryClient.setQueryData(key, data);
  }
}
