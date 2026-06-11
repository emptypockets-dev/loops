"use client";

import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { LOOP_COUNTED_PHRASE, type LoopOutcome } from "@/lib/constants";
import { formatDateShort } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

/**
 * Run a loop: check off steps, jot a note, complete. Always ends with the
 * literal phrase "This counted." — partial and minimum runs count too.
 */
export function LoopRunDialog({
  loop,
  open,
  onOpenChange,
}: {
  loop: Doc<"loops">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const completeRun = useMutation(api.loops.completeRun);
  const [startedAt] = useState(() => Date.now());
  const [checked, setChecked] = useState<boolean[]>(() => loop.steps.map(() => false));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [completedOutcome, setCompletedOutcome] = useState<LoopOutcome | null>(null);

  const checkedCount = useMemo(() => checked.filter(Boolean).length, [checked]);

  const finish = async (outcome: LoopOutcome) => {
    if (saving) return;
    setSaving(true);
    try {
      await completeRun({
        loopId: loop._id,
        startedAt,
        completedSteps: loop.steps.filter((_, i) => checked[i]),
        notes,
        outcome,
      });
      setCompletedOutcome(outcome);
    } catch (error) {
      console.error(error);
      toast.error("Couldn't record the run. Nothing was lost — try again.");
    } finally {
      setSaving(false);
    }
  };

  const completeLabel =
    checkedCount === loop.steps.length
      ? "Complete loop"
      : checkedCount > 0
        ? `Complete with ${checkedCount}/${loop.steps.length} steps`
        : "Complete anyway";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        {completedOutcome === null ? (
          <>
            <DialogHeader>
              <DialogTitle>{loop.name}</DialogTitle>
              <DialogDescription>{loop.description}</DialogDescription>
            </DialogHeader>

            <fieldset className="space-y-3">
              <legend className="sr-only">Loop steps</legend>
              {loop.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Checkbox
                    id={`step-${loop._id}-${i}`}
                    checked={checked[i]}
                    onCheckedChange={(value) => {
                      setChecked((prev) => prev.map((c, idx) => (idx === i ? value === true : c)));
                    }}
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor={`step-${loop._id}-${i}`}
                    className="cursor-pointer text-sm font-normal leading-snug"
                  >
                    {step}
                  </Label>
                </div>
              ))}
            </fieldset>

            {loop.minimumVersion && (
              <div className="rounded-md bg-accent p-3 text-sm text-accent-foreground">
                <span className="font-medium">Low-energy day? The minimum counts: </span>
                {loop.minimumVersion}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor={`notes-${loop._id}`}>Notes (optional)</Label>
              <Textarea
                id={`notes-${loop._id}`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything worth remembering from this run"
                rows={2}
              />
            </div>

            <DialogFooter className="sm:justify-between">
              <Button
                variant="outline"
                onClick={() => void finish("minimum")}
                disabled={saving}
              >
                I did the minimum
              </Button>
              <Button onClick={() => void finish(checkedCount === loop.steps.length ? "full" : "partial")} disabled={saving}>
                {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
                {completeLabel}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-primary" aria-hidden="true" />
            <DialogHeader>
              <DialogTitle className="text-2xl">{LOOP_COUNTED_PHRASE}</DialogTitle>
              <DialogDescription className="text-base">
                {completedOutcome === "minimum"
                  ? `The minimum version of ${loop.name} is a real run.`
                  : completedOutcome === "partial"
                    ? `${checkedCount} of ${loop.steps.length} steps — that's progress, recorded.`
                    : `${loop.name} fully done.`}
              </DialogDescription>
            </DialogHeader>
            <Separator />
            <p className="text-sm text-muted-foreground">
              {loop.cadence === "ad_hoc"
                ? "Run it again whenever you need it."
                : `Next nudge around ${formatDateShort(
                    Date.now() +
                      (loop.cadence === "daily" ? 1 : loop.cadence === "weekly" ? 7 : 30) *
                        24 *
                        60 *
                        60 *
                        1000
                  )}.`}
            </p>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
