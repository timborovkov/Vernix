"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskList } from "@/components/task-list";
import { ListChecks } from "lucide-react";
import type { Task } from "@/lib/db/schema";

interface TasksTabProps {
  tasks: Task[];
  loading: boolean;
  meetingStatus: string;
  hideCompleted: boolean;
  onHideCompletedChange: (value: boolean) => void;
  onAdd: (title: string) => void;
  onToggle: (taskId: string, status: string) => void;
  onDelete: (taskId: string) => void;
}

export function TasksTab({
  tasks,
  loading,
  meetingStatus,
  hideCompleted,
  onHideCompletedChange,
  onAdd,
  onToggle,
  onDelete,
}: TasksTabProps) {
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ListChecks className="h-4 w-4" />
            Action Items
          </CardTitle>
          {completedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onHideCompletedChange(!hideCompleted)}
              className="text-muted-foreground text-xs"
            >
              {hideCompleted
                ? `Show ${completedCount} completed`
                : "Hide completed"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="bg-muted h-4 w-4 animate-pulse rounded" />
                <div className="bg-muted h-4 flex-1 animate-pulse rounded-md" />
              </div>
            ))}
          </div>
        ) : meetingStatus === "processing" && tasks.length === 0 ? (
          <p className="text-muted-foreground italic">
            Extracting action items...
          </p>
        ) : (
          <TaskList
            tasks={
              hideCompleted ? tasks.filter((t) => t.status === "open") : tasks
            }
            onToggle={(taskId, status) => onToggle(taskId, status)}
            onDelete={onDelete}
            onAdd={onAdd}
          />
        )}
      </CardContent>
    </Card>
  );
}
