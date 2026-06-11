"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { CheckCircle2, Play, Timer } from "lucide-react";
import { isLoopDue } from "@/lib/loop-logic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/app/empty-state";
import { LoopRunDialog } from "@/components/loops/loop-run-dialog";

/** Due loops + open tasks: the "open loops needing attention" zone. */
export function OpenLoopsSection({
  loops,
  tasks,
}: {
  loops: Doc<"loops">[];
  tasks: Doc<"tasks">[];
}) {
  const setStatus = useMutation(api.tasks.setStatus);
  const [runningLoop, setRunningLoop] = useState<Doc<"loops"> | null>(null);

  const dueLoops = loops.filter((l) => isLoopDue(l));

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

      {tasks.map((task) => (
        <Card key={task._id}>
          <CardContent className="flex items-start gap-3 p-4">
            <Checkbox
              id={`task-${task._id}`}
              className="mt-1"
              checked={false}
              onCheckedChange={(value) => {
                if (value === true) {
                  void setStatus({ id: task._id, status: "done" })
                    .then(() => toast.success("Done. Marked and counted."))
                    .catch(() => toast.error("Couldn't update the task."));
                }
              }}
              aria-label={`Mark "${task.title}" done`}
            />
            <div className="min-w-0 flex-1 space-y-1">
              <label htmlFor={`task-${task._id}`} className="cursor-pointer font-medium leading-snug">
                {task.title}
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{task.category}</Badge>
                {task.status !== "todo" && <Badge variant="secondary">{task.status}</Badge>}
              </div>
              {task.fiveMinuteStart && (
                <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Timer className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {task.fiveMinuteStart}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

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
