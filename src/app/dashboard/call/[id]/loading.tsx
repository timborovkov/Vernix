import { Skeleton } from "@/components/ui/skeleton";

export default function MeetingDetailLoading() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Back + title */}
      <div className="mb-6">
        <Skeleton className="mb-4 h-7 w-16" />
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="mt-2 h-4 w-48" />
      </div>

      {/* Agenda card */}
      <div className="mb-6 rounded-xl border p-4">
        <Skeleton className="mb-3 h-5 w-20" />
        <Skeleton className="h-20 w-full" />
      </div>

      {/* Summary card */}
      <div className="mb-6 rounded-xl border p-4">
        <Skeleton className="mb-3 h-5 w-24" />
        <Skeleton className="mb-2 h-4 w-full" />
        <Skeleton className="mb-2 h-4 w-full" />
        <Skeleton className="mb-2 h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>

      {/* Tasks card */}
      <div className="mb-6 rounded-xl border p-4">
        <Skeleton className="mb-3 h-5 w-28" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 py-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>

      {/* Transcript */}
      <div className="rounded-xl border p-4">
        <Skeleton className="mb-4 h-5 w-24" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-3 py-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}
