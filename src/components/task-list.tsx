"use client";

import { useState } from "react";
import type { Task } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Trash2, Plus, User } from "lucide-react";

interface TaskListProps {
  tasks: Task[];
  onToggle: (taskId: string, status: string) => void;
  onDelete: (taskId: string) => void;
  onAdd: (title: string) => void;
  readOnly?: boolean;
}

export function TaskList({
  tasks,
  onToggle,
  onDelete,
  onAdd,
  readOnly,
}: TaskListProps) {
  const [newTitle, setNewTitle] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAdd(newTitle.trim());
    setNewTitle("");
  };

  if (tasks.length === 0 && readOnly) {
    return (
      <p className="text-muted-foreground py-4 text-center text-sm italic">
        No action items found
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <Card key={task.id}>
          <CardContent className="flex items-center gap-3 py-2.5">
            {!readOnly && (
              <button
                onClick={() =>
                  onToggle(
                    task.id,
                    task.status === "open" ? "completed" : "open"
                  )
                }
                className="text-muted-foreground hover:text-foreground shrink-0"
                aria-label={
                  task.status === "open" ? "Mark as completed" : "Mark as open"
                }
              >
                {task.status === "completed" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <Circle className="h-5 w-5" />
                )}
              </button>
            )}

            <div className="min-w-0 flex-1">
              <p
                className={`text-sm ${task.status === "completed" ? "text-muted-foreground line-through" : ""}`}
              >
                {task.title}
              </p>
            </div>

            {task.assignee && (
              <Badge variant="secondary" className="shrink-0 text-xs">
                <User className="mr-1 h-3 w-3" />
                {task.assignee}
              </Badge>
            )}

            {!readOnly && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(task.id)}
                aria-label={`Delete task: ${task.title}`}
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </CardContent>
        </Card>
      ))}

      {!readOnly && (
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add action item..."
            className="text-sm"
          />
          <Button type="submit" size="sm" disabled={!newTitle.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </form>
      )}
    </div>
  );
}
