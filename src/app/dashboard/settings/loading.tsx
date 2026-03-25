import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center gap-3">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-8 w-24" />
      </div>

      {/* MCP Server Access card */}
      <div className="mb-6 rounded-xl border p-4">
        <Skeleton className="mb-3 h-5 w-40" />
        <Skeleton className="mb-4 h-4 w-72" />
        <Skeleton className="mb-4 h-8 w-full" />
        <Skeleton className="mb-2 h-5 w-20" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-7 w-7" />
          </div>
        ))}
      </div>

      {/* External MCP Servers card */}
      <div className="rounded-xl border p-4">
        <Skeleton className="mb-3 h-5 w-44" />
        <Skeleton className="mb-4 h-4 w-64" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-7 w-7" />
          </div>
        ))}
      </div>
    </div>
  );
}
