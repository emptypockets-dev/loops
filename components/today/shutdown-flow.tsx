"use client";

import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Moon, Plus, Sunrise } from "lucide-react";
import { LOOP_COUNTED_PHRASE } from "@/lib/constants";
import { addDaysStr, localToday } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Step = "mind" | "wins" | "tomorrow" | "done";

/**
 * Guided Evening Shutdown: empty your head → mark what happened → choose
 * tomorrow's first action → stop. Records a run of the Evening Shutdown loop
 * (when it exists) and hands tomorrow-you a starting point that the next
 * morning's brief is required to honor.
 */
export function ShutdownFlow({
  loop,
  openTasks,
  open,
  onOpenChange,
}: {
  loop: Doc<"loops"> | null;
  openTasks: Doc<"tasks">[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const captureMany = useMutation(api.inboxItems.captureMany);
  const setStatus = useMutation(api.tasks.setStatus);
  const setFirstAction = useMutation(api.users.setFirstAction);
  const completeRun = useMutation(api.loops.completeRun);

  const [startedAt] = useState(() => Date.now());
  const [step, setStep] = useState<Step>("mind");
  const [mindText, setMindText] = useState("");
  const [capturedCount, setCapturedCount] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [winsMarked, setWinsMarked] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState<Id<"tasks"> | null>(null);
  const [customAction, setCustomAction] = useState("");
  const [finishing, setFinishing] = useState(false);
  const [chosenText, setChosenText] = useState<string | null>(null);

  // A short, calm list — six is plenty to pick a morning starting point from.
  const candidateTasks = useMemo(() => openTasks.slice(0, 6), [openTasks]);

  const captureMind = async () => {
    const lines = mindText.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0 || capturing) return;
    setCapturing(true);
    try {
      const { count } = await captureMany({ lines });
      setCapturedCount((c) => c + count);
      setMindText("");
      toast.success(`${count} thing${count === 1 ? "" : "s"} out of your head.`);
    } catch (error) {
      console.error(error);
      toast.error("Couldn't capture that. Try again.");
    } finally {
      setCapturing(false);
    }
  };

  const markWin = (task: Doc<"tasks">, checked: boolean) => {
    if (!checked) return;
    setWinsMarked((w) => w + 1);
    void setStatus({ id: task._id, status: "done" })
      .then(() => toast.success("Done. Counted."))
      .catch(() => toast.error("Couldn't update the task."));
  };

  const finish = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      // 1. Store tomorrow's first action (optional — skipping is allowed).
      const selectedTask = candidateTasks.find((t) => t._id === selectedTaskId) ?? null;
      const text = selectedTask
        ? selectedTask.fiveMinuteStart || selectedTask.title
        : customAction.trim();
      if (text) {
        await setFirstAction({
          text,
          forDate: addDaysStr(localToday(), 1),
          taskId: selectedTask?._id,
        });
        setChosenText(text);
      }
      // 2. Record the run — partial still counts; that's the whole point.
      if (loop) {
        await completeRun({
          loopId: loop._id,
          startedAt,
          completedSteps: loop.steps,
          notes:
            `Guided shutdown: ${capturedCount} captured, ${winsMarked} marked done` +
            (text ? `, first action chosen.` : `.`),
          outcome: text ? "full" : "partial",
          tzOffsetMinutes: new Date().getTimezoneOffset(),
        });
      }
      setStep("done");
    } catch (error) {
      console.error(error);
      toast.error("Couldn't finish the shutdown. Nothing you entered was lost.");
    } finally {
      setFinishing(false);
    }
  };

  const stepIndex = step === "mind" ? 1 : step === "wins" ? 2 : 3;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        {step === "done" ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-primary" aria-hidden="true" />
            <DialogHeader>
              <DialogTitle className="text-2xl">{LOOP_COUNTED_PHRASE}</DialogTitle>
              <DialogDescription className="text-base">
                Shutdown complete. {capturedCount > 0 && `${capturedCount} thoughts are parked in the Inbox. `}
                {chosenText ? (
                  <>
                    Tomorrow starts with: <span className="font-medium text-foreground">{chosenText}</span>
                  </>
                ) : (
                  "Tomorrow's brief will offer a starting point."
                )}
              </DialogDescription>
            </DialogHeader>
            <Separator />
            <p className="text-sm italic text-muted-foreground">
              Now stop. The day is closed — your head doesn't have to hold it.
            </p>
            <Button onClick={() => onOpenChange(false)}>Good night</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Moon className="h-5 w-5 text-primary" aria-hidden="true" />
                Evening Shutdown
              </DialogTitle>
              <DialogDescription>Step {stepIndex} of 3 — none of this is graded.</DialogDescription>
            </DialogHeader>

            {step === "mind" && (
              <div className="space-y-3">
                <Label htmlFor="shutdown-mind" className="text-base font-medium">
                  Anything still on your mind?
                </Label>
                <p className="text-sm text-muted-foreground">
                  One thing per line. It goes to the Inbox so your head can let go of it.
                </p>
                <Textarea
                  id="shutdown-mind"
                  value={mindText}
                  onChange={(e) => setMindText(e.target.value)}
                  placeholder={"email the landlord back\nbuy a birthday card\nthat weird noise the car makes"}
                  rows={4}
                  autoFocus
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {capturedCount > 0 && `${capturedCount} captured so far`}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => void captureMind()}
                      disabled={!mindText.trim() || capturing}
                    >
                      {capturing ? (
                        <Loader2 className="animate-spin" aria-hidden="true" />
                      ) : (
                        <Plus aria-hidden="true" />
                      )}
                      Capture
                    </Button>
                    <Button onClick={() => setStep("wins")}>
                      {capturedCount > 0 || !mindText.trim() ? "Head's empty — next" : "Next"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {step === "wins" && (
              <div className="space-y-3">
                <p className="text-base font-medium">Did any of these actually happen today?</p>
                <p className="text-sm text-muted-foreground">
                  Check what got done — partials and almosts don't need to be settled tonight.
                </p>
                {candidateTasks.length === 0 ? (
                  <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                    No open tasks to mark. That's a clean slate, not a gap.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {candidateTasks.map((task) => (
                      <div key={task._id} className="flex items-start gap-3">
                        <Checkbox
                          id={`win-${task._id}`}
                          className="mt-0.5"
                          checked={false}
                          onCheckedChange={(value) => markWin(task, value === true)}
                        />
                        <Label htmlFor={`win-${task._id}`} className="cursor-pointer text-sm font-normal leading-snug">
                          {task.title}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button onClick={() => setStep("tomorrow")}>Next</Button>
                </div>
              </div>
            )}

            {step === "tomorrow" && (
              <div className="space-y-3">
                <p className="flex items-center gap-2 text-base font-medium">
                  <Sunrise className="h-4 w-4 text-primary" aria-hidden="true" />
                  What should tomorrow start with?
                </p>
                <p className="text-sm text-muted-foreground">
                  One thing. Morning-you will find it waiting, and the brief will build around it.
                </p>
                <div className="space-y-2" role="radiogroup" aria-label="Tomorrow's first action">
                  {candidateTasks.map((task) => {
                    const selected = selectedTaskId === task._id;
                    return (
                      <button
                        key={task._id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => {
                          setSelectedTaskId(selected ? null : task._id);
                          setCustomAction("");
                        }}
                        className={cn(
                          "w-full rounded-md border p-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          selected ? "border-primary bg-accent" : "hover:bg-muted"
                        )}
                      >
                        <span className="font-medium">{task.title}</span>
                        {task.fiveMinuteStart && (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            5-min start: {task.fiveMinuteStart}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="custom-first-action" className="text-sm text-muted-foreground">
                    Or name your own
                  </Label>
                  <Input
                    id="custom-first-action"
                    value={customAction}
                    onChange={(e) => {
                      setCustomAction(e.target.value);
                      if (e.target.value) setSelectedTaskId(null);
                    }}
                    placeholder="e.g. Reread the lease draft once, slowly"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 pt-2">
                  <Button
                    variant="ghost"
                    className="text-muted-foreground"
                    onClick={() => void finish()}
                    disabled={finishing}
                  >
                    Skip — close the day
                  </Button>
                  <Button
                    onClick={() => void finish()}
                    disabled={finishing || (!selectedTaskId && !customAction.trim())}
                  >
                    {finishing && <Loader2 className="animate-spin" aria-hidden="true" />}
                    Choose & finish
                  </Button>
                </div>
                {loop === null && (
                  <Badge variant="outline" className="text-muted-foreground">
                    Evening Shutdown loop not found — the ritual still works, it just won't log a run
                  </Badge>
                )}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
