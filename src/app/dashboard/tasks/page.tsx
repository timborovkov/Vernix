"use client";

import { useState } from "react";
import Link from "next/link";
import { useAllTasks } from "@/hooks/use-all-tasks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  ListChecks,
  User,
} from "lucide-react";

type StatusFilter = "all" | "open" | "completed";

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export default function TasksPage() {
  const [filter, setFilter] = useState<StatusFilter>("open");
  const { tasks, loading, updateTask } = useAllTasks(
    filter === "all" ? undefined : filter
  );

  const handleToggle = (
    meetingId: string,
    taskId: string,
    currentStatus: string
  ) => {
    updateTask(meetingId, taskId, {
      status: currentStatus === "open" ? "completed" : "open",
    });
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <Button variant="ghost" size="sm" render={<Link href="/dashboard" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-muted-foreground text-sm">
            Action items from your meetings
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mb-6 flex gap-1">
        {(["open", "all", "completed"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "accent" : "outline"}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All" : f === "open" ? "Open" : "Completed"}
          </Button>
        ))}
      </div>

      {/* Task list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-3 px-4 py-3">
                <div className="bg-muted h-5 w-5 animate-pulse rounded-full" />
                <div className="bg-muted h-4 flex-1 animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          <ListChecks className="mx-auto mb-3 h-12 w-12 opacity-40" />
          <p className="text-lg font-medium">
            {filter === "open"
              ? "No open tasks"
              : filter === "completed"
                ? "No completed tasks"
                : "No tasks yet"}
          </p>
          <p className="text-sm">
            Tasks are automatically extracted from your meeting transcripts.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <Card key={task.id}>
              <CardContent className="flex items-center gap-3 px-4 py-3">
                {/* Checkbox */}
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                  onClick={() =>
                    handleToggle(task.meetingId, task.id, task.status)
                  }
                >
                  {task.status === "completed" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm ${task.status === "completed" ? "text-muted-foreground line-through" : ""}`}
                  >
                    {task.title}
                  </p>
                  {task.sourceText && (
                    <p className="text-muted-foreground mt-0.5 truncate text-xs italic">
                      &quot;{task.sourceText}&quot;
                    </p>
                  )}
                  <div className="mt-0.5 flex items-center gap-2">
                    {task.meetingTitle && (
                      <Link
                        href={`/dashboard/${task.meetingId}`}
                        className="text-muted-foreground hover:text-foreground truncate text-xs transition-colors"
                      >
                        {task.meetingTitle}
                      </Link>
                    )}
                  </div>
                </div>

                {/* Assignee */}
                {task.assignee && (
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    <User className="mr-0.5 h-3 w-3" />
                    {task.assignee}
                  </Badge>
                )}

                {/* Time */}
                <span className="text-muted-foreground shrink-0 text-xs">
                  {formatRelativeTime(task.createdAt)}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
