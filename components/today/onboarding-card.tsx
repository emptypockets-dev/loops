"use client";

import { useState } from "react";
import Link from "next/link";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Loader2,
  PartyPopper,
  Sparkles,
} from "lucide-react";
import { localToday } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StepDef {
  key: string;
  done: boolean;
  title: string;
  description: string;
  action?: { label: string; href: string };
}

/**
 * Getting-started checklist, derived from real usage (no fake progress to
 * maintain). Shows until the core loop has been walked once or the user
 * dismisses it — then never again.
 */
export function OnboardingCard() {
  const status = useQuery(api.users.onboardingStatus);
  const dismiss = useMutation(api.users.dismissOnboarding);
  const generateBrief = useAction(api.ai.generateDailyBrief);
  const [generating, setGenerating] = useState(false);

  if (!status || status.dismissed) return null;

  const steps: StepDef[] = [
    {
      key: "captured",
      done: status.captured,
      title: "Empty your head",
      description:
        "Two minutes, no order, no editing — bills, that email, the squeaky door, the idea you keep losing. One thing per line; sorting is the app's job.",
      action: { label: "Brain dump", href: "/capture" },
    },
    {
      key: "classified",
      done: status.classified,
      title: "Let AI sort one thing",
      description:
        "Hit “AI classify” on any item. It suggests a category, urgency, and the smallest honest next action — all editable.",
      action: { label: "Open Inbox", href: "/inbox" },
    },
    {
      key: "taskCreated",
      done: status.taskCreated,
      title: "Turn one into a task",
      description: "“Make it a task” moves something from swirling to scheduled-ish.",
      action: { label: "Open Inbox", href: "/inbox" },
    },
    {
      key: "briefGenerated",
      done: status.briefGenerated,
      title: "Generate your first Daily Brief",
      description: "It reads what you've captured and names what matters — and what can wait.",
    },
    {
      key: "loopRun",
      done: status.loopRun,
      title: "Run one loop — the minimum counts",
      description:
        "Try Evening Shutdown or Body Check. However far you get, it ends with “This counted.”",
      action: { label: "Open Loops", href: "/loops" },
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  const onDismiss = () => {
    void dismiss({}).catch(() => toast.error("Couldn't hide the checklist."));
  };

  const onGenerateBrief = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const result = await generateBrief({
        date: localToday(),
        tzOffsetMinutes: new Date().getTimezoneOffset(),
      });
      if (!result.ok) {
        toast.error(result.error);
      } else {
        toast.success("Brief ready — it's right below.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Couldn't generate the brief. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  if (allDone) {
    return (
      <Card className="border-primary/40 bg-accent/40">
        <CardContent className="flex flex-wrap items-center gap-4 p-6">
          <PartyPopper className="h-8 w-8 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="text-lg font-semibold">You've walked the whole loop.</h2>
            <p className="text-sm text-muted-foreground">
              Capture, classify, decide, brief, run — that's the entire system. From here it's just
              repetition, and repetition is the point.
            </p>
          </div>
          <Button onClick={onDismiss}>Done — hide this</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/40 bg-accent/40">
      <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
        <div className="space-y-1.5">
          <CardTitle className="text-lg">Getting the hang of Loops</CardTitle>
          <p className="text-sm text-muted-foreground">
            Five small moves and you'll have seen the whole system. No deadline.
          </p>
        </div>
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onDismiss}>
          Skip the tour
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            {doneCount} of {steps.length}
          </p>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={steps.length}
            aria-valuenow={doneCount}
            aria-label="Onboarding progress"
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(doneCount / steps.length) * 100}%` }}
            />
          </div>
        </div>

        <ol className="space-y-3">
          {steps.map((step) => (
            <li key={step.key} className="flex items-start gap-3">
              {step.done ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1">
                <p className={cn("font-medium leading-snug", step.done && "text-muted-foreground line-through decoration-1")}>
                  {step.title}
                  <span className="sr-only">{step.done ? " (done)" : " (not done yet)"}</span>
                </p>
                {!step.done && (
                  <p className="mt-0.5 text-sm text-muted-foreground">{step.description}</p>
                )}
              </div>
              {!step.done &&
                (step.key === "briefGenerated" ? (
                  <Button size="sm" variant="outline" onClick={() => void onGenerateBrief()} disabled={generating}>
                    {generating ? (
                      <Loader2 className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Sparkles aria-hidden="true" />
                    )}
                    Generate
                  </Button>
                ) : (
                  step.action && (
                    <Button size="sm" variant="outline" asChild>
                      <Link href={step.action.href}>
                        {step.action.label} <ArrowRight aria-hidden="true" />
                      </Link>
                    </Button>
                  )
                ))}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
