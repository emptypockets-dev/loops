"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import {
  CircleDot,
  Clock,
  History,
  MoreHorizontal,
  Pause,
  PenLine,
  Play,
  Trash2,
} from "lucide-react";
import { getLoopDueState, LOOP_TIME_LABELS } from "@/lib/loop-logic";
import { formatAgo, formatDateShort } from "@/lib/dates";
import type { Cadence } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { useTimeWindows } from "@/components/app/use-time-windows";
import { LoopFormDialog } from "./loop-form-dialog";
import { LoopHistoryDialog } from "./loop-history-dialog";
import { LoopRunDialog } from "./loop-run-dialog";

const CADENCE_LABELS: Record<Cadence, string> = {
  daily: "daily",
  weekly: "weekly",
  monthly: "monthly",
  ad_hoc: "ad hoc",
};

export function LoopCard({ loop }: { loop: Doc<"loops"> }) {
  const setActive = useMutation(api.loops.setActive);
  const remove = useMutation(api.loops.remove);
  const [runOpen, setRunOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const windows = useTimeWindows();
  const dueState = getLoopDueState(loop, Date.now(), new Date().getHours(), windows);
  const due = dueState === "due_now";

  return (
    <Card className={!loop.isActive ? "opacity-70" : undefined}>
      <CardHeader className="space-y-2 p-4 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{CADENCE_LABELS[loop.cadence]}</Badge>
          {due && (
            <Badge className="bg-accent text-accent-foreground">
              <CircleDot aria-hidden="true" /> due now
            </Badge>
          )}
          {dueState === "later_today" && (
            <Badge variant="outline">
              <Clock aria-hidden="true" /> {LOOP_TIME_LABELS[loop.timeOfDay ?? "anytime"]}
            </Badge>
          )}
          {!loop.isActive && <Badge variant="outline">paused</Badge>}
        </div>
        <CardTitle className="text-base">{loop.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-0">
        {loop.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{loop.description}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {loop.category}
          {" · "}
          {loop.steps.length} step{loop.steps.length === 1 ? "" : "s"}
          {loop.timeOfDay && loop.timeOfDay !== "anytime" ? ` · ${loop.timeOfDay}s` : ""}
          {" · "}
          {loop.lastRunAt ? `last run ${formatAgo(loop.lastRunAt)}` : "never run — no pressure"}
          {loop.nextRunAt && dueState === "scheduled"
            ? ` · next ${formatDateShort(loop.nextRunAt)}`
            : ""}
        </p>
      </CardContent>
      <CardFooter className="flex gap-2 p-4 pt-0">
        <Button size="sm" onClick={() => setRunOpen(true)} disabled={!loop.isActive}>
          <Play aria-hidden="true" />
          Run
        </Button>
        <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
          <PenLine aria-hidden="true" />
          Edit
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="ml-auto" aria-label={`More actions for ${loop.name}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setHistoryOpen(true)}>
              <History /> Run history
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                void setActive({ id: loop._id, isActive: !loop.isActive }).then(() =>
                  toast.success(loop.isActive ? "Loop paused." : "Loop reactivated.")
                )
              }
            >
              {loop.isActive ? (
                <>
                  <Pause /> Pause loop
                </>
              ) : (
                <>
                  <Play /> Reactivate loop
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => setDeleteOpen(true)}
            >
              <Trash2 /> Delete loop
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>

      {runOpen && <LoopRunDialog loop={loop} open={runOpen} onOpenChange={setRunOpen} />}
      {editOpen && <LoopFormDialog loop={loop} open={editOpen} onOpenChange={setEditOpen} />}
      {historyOpen && (
        <LoopHistoryDialog loop={loop} open={historyOpen} onOpenChange={setHistoryOpen} />
      )}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete "${loop.name}"?`}
        description="This removes the loop and its run history. Pausing keeps the history if you just need a break."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          void remove({ id: loop._id })
            .then(() => toast.success("Loop deleted."))
            .catch(() => toast.error("Couldn't delete the loop."));
        }}
      />
    </Card>
  );
}
