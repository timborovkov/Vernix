export default function IntegrationsLoading() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <div className="bg-muted h-8 w-48 animate-pulse rounded-md" />
        <div className="bg-muted mt-2 h-4 w-80 animate-pulse rounded-md" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-4">
            <div className="flex items-start gap-3">
              <div className="bg-muted h-10 w-10 animate-pulse rounded-lg" />
              <div className="flex-1">
                <div className="bg-muted h-4 w-24 animate-pulse rounded-md" />
                <div className="bg-muted mt-2 h-3 w-56 animate-pulse rounded-md" />
              </div>
              <div className="bg-muted h-7 w-20 animate-pulse rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
