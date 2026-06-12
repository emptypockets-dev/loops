"use client";

import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, LifeBuoy, Loader2, Timer } from "lucide-react";
import { LOOP_COUNTED_PHRASE } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface Suggestion {
  nudgeId: Id<"nudges">;
  suggestion: string;
  reason: string;
  fiveMinuteVersion: string;
  reassurance: string;
}

const MAX_REROLLS = 3;

/**
 * The Unstuck Button: for the frozen moment. One press → exactly one thing,
 * chosen from real data, with the first five minutes spelled out. Never a
 * list — lists are the problem. Lives as a quiet header button; the dialog
 * is the moment of focus.
 */
export function UnstuckButton() {
  const getUnstuck = useAction(api.ai.getUnstuck);
  const markActed = useMutation(api.nudges.markActed);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState<Suggestion | null>(null);
  const [seen, setSeen] = useState<string[]>([]);
  const [acted, setActed] = useState(false);

  const ask = async (previous: string[]) => {
    setLoading(true);
    try {
      const result = await getUnstuck({
        localHour: new Date().getHours(),
        previousSuggestions: previous,
      });
      if (!result.ok) {
        toast.error(result.error);
        if (!current) setOpen(false);
        return;
      }
      setCurrent({
        nudgeId: result.nudgeId,
        suggestion: result.suggestion,
        reason: result.reason,
        fiveMinuteVersion: result.fiveMinuteVersion,
        reassurance: result.reassurance,
      });
      setSeen([...previous, result.suggestion]);
    } catch (error) {
      console.error(error);
      toast.error("Couldn't pick a next step. The button still works — try again.");
      if (!current) setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const start = () => {
    setOpen(true);
    setCurrent(null);
    setSeen([]);
    setActed(false);
    void ask([]);
  };

  const onActed = () => {
    if (!current) return;
    setActed(true);
    void markActed({ id: current.nudgeId }).catch(() => {
      // The moment matters more than the bookkeeping — stay calm.
      console.error("Failed to mark nudge acted");
    });
  };

  const rerollsLeft = MAX_REROLLS - (seen.length - 1);

  return (
    <>
      <Button variant="outline" onClick={start} disabled={loading} title="One small thing, picked from your actual stuff">
        <LifeBuoy aria-hidden="true" />
        Stuck? One thing
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          {acted && current ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-primary" aria-hidden="true" />
              <DialogHeader>
                <DialogTitle className="text-2xl">{LOOP_COUNTED_PHRASE}</DialogTitle>
                <DialogDescription className="text-base">
                  You were stuck, and you did a thing anyway. That's the whole skill.
                </DialogDescription>
              </DialogHeader>
              <Button onClick={() => setOpen(false)}>Close</Button>
            </div>
          ) : loading && !current ? (
            <div
              className="flex flex-col items-center gap-3 py-10 text-center"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">Choosing the kindest next step…</p>
            </div>
          ) : current ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl leading-snug">{current.suggestion}</DialogTitle>
                <DialogDescription>{current.reason}</DialogDescription>
              </DialogHeader>

              <div className="flex items-start gap-2 rounded-md bg-accent p-3 text-sm text-accent-foreground">
                <Timer className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p>
                  <span className="font-medium">First five minutes: </span>
                  {current.fiveMinuteVersion}
                </p>
              </div>

              <p className="text-sm italic text-muted-foreground">{current.reassurance}</p>

              <Separator />

              <div className="flex flex-wrap gap-2">
                <Button onClick={onActed} disabled={loading}>
                  <CheckCircle2 aria-hidden="true" /> I did it
                </Button>
                {rerollsLeft > 0 ? (
                  <Button variant="outline" onClick={() => void ask(seen)} disabled={loading}>
                    {loading ? (
                      <Loader2 className="animate-spin" aria-hidden="true" />
                    ) : (
                      <ArrowRight aria-hidden="true" />
                    )}
                    Different one
                  </Button>
                ) : (
                  <p className="self-center text-xs text-muted-foreground">
                    Three options is enough. Pick the least bad one — or rest.
                  </p>
                )}
                <Button
                  variant="ghost"
                  className="ml-auto text-muted-foreground"
                  onClick={() => setOpen(false)}
                >
                  Not now
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
