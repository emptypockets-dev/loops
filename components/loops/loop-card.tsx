"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import {
  CircleDot,
  MoreHorizontal,
  Pause,
  PenLine,
  Play,
  Trash2,
} from "lucide-react";
import { isLoopDue } from "@/lib/loop-logic";
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
import { LoopFormDialog } from "./loop-form-dialog";
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

  const due = isLoopDue(loop);

  return (
    <Card className={!loop.isActive ? "opacity-70" : undefined}>
      <CardHeader className="space-y-2 p-4 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{CADENCE_LABELS[loop.cadence]}</Badge>
          <Badge variant="outline">{loop.category}</Badge>
          {due && loop.isActive && (
            <Badge className="bg-accent text-accent-foreground">
              <CircleDot aria-hidden="true" /> due now
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
          {loop.steps.length} step{loop.steps.length === 1 ? "" : "s"}
          {" · "}
          {loop.lastRunAt ? `last run ${formatAgo(loop.lastRunAt)}` : "never run — no pressure"}
          {loop.nextRunAt && !due ? ` · next ${formatDateShort(loop.nextRunAt)}` : ""}
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
