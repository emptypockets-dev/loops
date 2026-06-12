"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import {
  Archive,
  CheckCircle2,
  Hourglass,
  MoreHorizontal,
  Play,
  RotateCcw,
  Timer,
  Trash2,
} from "lucide-react";
import { isLoopDue } from "@/lib/loop-logic";
import { formatAgo } from "@/lib/dates";
import type { TaskStatus } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/app/empty-state";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { LoopRunDialog } from "@/components/loops/loop-run-dialog";

function TaskRow({ task, waiting = false }: { task: Doc<"tasks">; waiting?: boolean }) {
  const setStatus = useMutation(api.tasks.setStatus);
  const removeTask = useMutation(api.tasks.remove);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const move = (status: TaskStatus, message: string) => {
    void setStatus({ id: task._id, status })
      .then(() => toast.success(message))
      .catch(() => toast.error("Couldn't update the task."));
  };

  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <Checkbox
          id={`task-${task._id}`}
          className="mt-1"
          checked={false}
          onCheckedChange={(value) => {
            if (value === true) move("done", "Done. Marked and counted.");
          }}
          aria-label={`Mark "${task.title}" done`}
        />
        <div className="min-w-0 flex-1 space-y-1">
          <label htmlFor={`task-${task._id}`} className="cursor-pointer font-medium leading-snug">
            {task.title}
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{task.category}</Badge>
            {task.status === "doing" && <Badge variant="secondary">in progress</Badge>}
            {waiting && (
              <span className="text-xs text-muted-foreground">
                waiting {formatAgo(task.updatedAt).replace(" ago", "")}
              </span>
            )}
          </div>
          {task.fiveMinuteStart && !waiting && (
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Timer className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {task.fiveMinuteStart}
            </p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" aria-label={`More actions for ${task.title}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {task.status !== "doing" && !waiting && (
              <DropdownMenuItem onSelect={() => move("doing", "Marked in progress.")}>
                <Play /> I'm on it
              </DropdownMenuItem>
            )}
            {waiting ? (
              <DropdownMenuItem onSelect={() => move("todo", "Back on your list.")}>
                <RotateCcw /> Ball's back in my court
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => move("waiting", "Parked as waiting on someone else.")}>
                <Hourglass /> Waiting on someone
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onSelect={() => move("dropped", "Dropped. That was a decision, and it counts.")}
            >
              <Archive /> Drop it (allowed!)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => setDeleteOpen(true)}
            >
              <Trash2 /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this task?"
        description="This removes it entirely. Dropping keeps it in the record as a decision."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          void removeTask({ id: task._id })
            .then(() => toast.success("Deleted."))
            .catch(() => toast.error("Couldn't delete the task."));
        }}
      />
    </Card>
  );
}

/** Due loops + open tasks: the "open loops needing attention" zone. */
export function OpenLoopsSection({
  loops,
  tasks,
}: {
  loops: Doc<"loops">[];
  tasks: Doc<"tasks">[];
}) {
  const [runningLoop, setRunningLoop] = useState<Doc<"loops"> | null>(null);

  const dueLoops = loops.filter((l) => isLoopDue(l));
  const activeTasks = tasks.filter((t) => t.status === "todo" || t.status === "doing");
  const waitingTasks = tasks.filter((t) => t.status === "waiting");

  if (dueLoops.length === 0 && tasks.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="Nothing demanding attention"
        description="No due loops, no open tasks. Enjoy the quiet — it's earned, not borrowed."
      />
    );
  }

  return (
    <div className="space-y-3">
      {dueLoops.map((loop) => (
        <Card key={loop._id}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{loop.name}</p>
              <p className="text-xs text-muted-foreground">
                {loop.cadence} loop · due now
                {loop.minimumVersion ? ` · minimum: ${loop.minimumVersion}` : ""}
              </p>
            </div>
            <Button size="sm" onClick={() => setRunningLoop(loop)}>
              <Play aria-hidden="true" /> Run
            </Button>
          </CardContent>
        </Card>
      ))}

      {activeTasks.map((task) => (
        <TaskRow key={task._id} task={task} />
      ))}

      {waitingTasks.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Hourglass className="h-3.5 w-3.5" aria-hidden="true" />
            Waiting on someone else
          </h3>
          {waitingTasks.map((task) => (
            <TaskRow key={task._id} task={task} waiting />
          ))}
        </div>
      )}

      {runningLoop && (
        <LoopRunDialog
          loop={runningLoop}
          open={runningLoop !== null}
          onOpenChange={(open) => {
            if (!open) setRunningLoop(null);
          }}
        />
      )}
    </div>
  );
}
