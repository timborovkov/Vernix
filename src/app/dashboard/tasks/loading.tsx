import { Card, CardContent } from "@/components/ui/card";

export default function TasksLoading() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <div className="bg-muted mb-2 h-8 w-32 animate-pulse rounded" />
        <div className="bg-muted h-4 w-64 animate-pulse rounded" />
      </div>
      <div className="mb-6 flex gap-1">
        <div className="bg-muted h-8 w-16 animate-pulse rounded" />
        <div className="bg-muted h-8 w-12 animate-pulse rounded" />
        <div className="bg-muted h-8 w-24 animate-pulse rounded" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-3 px-4 py-3">
              <div className="bg-muted h-5 w-5 animate-pulse rounded-full" />
              <div className="bg-muted h-4 flex-1 animate-pulse rounded" />
              <div className="bg-muted h-4 w-16 animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
