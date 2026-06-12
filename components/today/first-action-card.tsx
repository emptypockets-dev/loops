"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { CheckCircle2, Sunrise } from "lucide-react";
import { localToday } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * The morning payoff of last night's shutdown: the one action tonight-you
 * chose for morning-you. Doing it (or clearing it) is judgement-free.
 */
export function FirstActionCard() {
  const user = useQuery(api.users.current);
  const complete = useMutation(api.users.completeFirstAction);
  const clear = useMutation(api.users.clearFirstAction);

  const firstAction = user?.nextFirstAction;
  if (!firstAction || firstAction.forDate !== localToday()) return null;

  return (
    <Card className="border-primary/40 bg-accent/40">
      <CardContent className="flex flex-wrap items-center gap-4 p-5">
        <Sunrise className="h-7 w-7 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Chosen last night — start here
          </p>
          <p className="text-lg font-medium leading-snug">{firstAction.text}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            onClick={() => {
              void complete({ markTaskDone: true })
                .then(() =>
                  toast.success("This counted. The rest of the day is bonus.")
                )
                .catch(() => toast.error("Couldn't record that."));
            }}
          >
            <CheckCircle2 aria-hidden="true" /> Did it
          </Button>
          <Button
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => {
              void clear()
                .then(() => toast.success("Cleared — the brief has other starting points."))
                .catch(() => toast.error("Couldn't clear it."));
            }}
          >
            Not today
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
