"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { CheckCircle2, History } from "lucide-react";
import type { LoopOutcome } from "@/lib/constants";
import { formatAgo, formatDateShort } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/app/empty-state";
import { LoadingState } from "@/components/app/loading-state";

const OUTCOME_LABELS: Record<LoopOutcome, string> = {
  full: "full run",
  partial: "partial run",
  minimum: "minimum version",
};

/** Every run counted — here's the accumulated proof. */
export function LoopHistoryDialog({
  loop,
  open,
  onOpenChange,
}: {
  loop: Doc<"loops">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const runs = useQuery(api.loops.runsForLoop, open ? { loopId: loop._id } : "skip");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{loop.name} — history</DialogTitle>
          <DialogDescription>
            Every run here counted: full, partial, and minimum alike.
          </DialogDescription>
        </DialogHeader>

        {runs === undefined ? (
          <LoadingState label="Loading runs…" rows={2} />
        ) : runs.length === 0 ? (
          <EmptyState
            icon={History}
            title="No runs yet"
            description="No pressure. The first run can be the minimum version — it still counts."
          />
        ) : (
          <ul className="space-y-3">
            {runs.map((run) => (
              <li key={run._id} className="space-y-1.5 rounded-md border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="text-sm font-medium">{formatDateShort(run.startedAt)}</span>
                  <Badge variant="secondary">{OUTCOME_LABELS[run.outcome as LoopOutcome]}</Badge>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatAgo(run.completedAt ?? run.startedAt)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {run.completedSteps.length} of {loop.steps.length} steps
                </p>
                {run.notes && <p className="text-sm italic text-muted-foreground">{run.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
