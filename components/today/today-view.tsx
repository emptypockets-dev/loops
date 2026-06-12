"use client";

import { useMemo, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Inbox as InboxIcon, Target } from "lucide-react";
import { localToday } from "@/lib/dates";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/app/empty-state";
import { ErrorBoundary } from "@/components/app/error-boundary";
import { LoadingState } from "@/components/app/loading-state";
import { ApprovalDraftCard } from "./approval-draft-card";
import { CalendarSection } from "./calendar-section";
import { FirstActionCard } from "./first-action-card";
import { OnboardingCard } from "./onboarding-card";
import { ResolvedDraftsSheet } from "./resolved-drafts-sheet";
import { UnstuckCard } from "./unstuck-card";
import { DailyBriefCard } from "./daily-brief-card";
import { FiveMinuteStartCard } from "./five-minute-start-card";
import { OpenLoopsSection } from "./open-loops-section";
import { ShutdownCta } from "./shutdown-cta";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{children}</h2>;
}

export function TodayView() {
  const today = useMemo(() => localToday(), []);
  const brief = useQuery(api.dailyBriefs.getForDate, { date: today });
  const pendingDrafts = useQuery(api.drafts.listPending);
  const loops = useQuery(api.loops.list);
  const openTasks = useQuery(api.tasks.listOpen);
  const localMidnightMs = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);
  const tasksDoneToday = useQuery(api.tasks.doneSince, { sinceMs: localMidnightMs });
  const recentRuns = useQuery(api.loops.recentRuns, { limit: 20 });
  const runsToday = recentRuns?.filter((r) => r.startedAt >= localMidnightMs).length ?? 0;
  const generateBrief = useAction(api.ai.generateDailyBrief);
  const [generating, setGenerating] = useState(false);

  const onGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const result = await generateBrief({
        date: today,
        // getTimezoneOffset() lets the server window "today" to the user's actual day.
        tzOffsetMinutes: new Date().getTimezoneOffset(),
      });
      if (!result.ok) {
        toast.error(result.error);
      } else {
        toast.success("Brief ready.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Couldn't generate the brief. The page is fine — try again.");
    } finally {
      setGenerating(false);
    }
  };

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <p className="text-muted-foreground">{dateLabel} — what matters now, nothing more.</p>
      </header>

      <ErrorBoundary label="your first action">
        <FirstActionCard />
      </ErrorBoundary>

      <ErrorBoundary label="getting started">
        <OnboardingCard />
      </ErrorBoundary>

      <ErrorBoundary label="the unstuck button">
        <UnstuckCard />
      </ErrorBoundary>

      <ErrorBoundary label="the daily brief">
        <section aria-label="Daily brief" className="space-y-3">
          {brief === undefined ? (
            <LoadingState label="Loading the brief…" rows={1} />
          ) : (
            <DailyBriefCard brief={brief} generating={generating} onGenerate={() => void onGenerate()} />
          )}
        </section>
      </ErrorBoundary>

      {brief && brief.topOutcomes.length > 0 && (
        <section aria-label="Top 3 outcomes" className="space-y-3">
          <SectionHeading>Top 3 outcomes</SectionHeading>
          <div className="space-y-2">
            {brief.topOutcomes.map((outcome, i) => (
              <Card key={i}>
                <CardContent className="flex items-center gap-3 p-4">
                  <Target className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <p className="font-medium leading-snug">{outcome}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {brief && brief.fiveMinuteStarts.length > 0 && (
        <section aria-label="Five minute starts" className="space-y-3">
          <SectionHeading>5-minute starts</SectionHeading>
          <p className="text-sm text-muted-foreground">
            Can't face the big thing? Start with five minutes of it.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {brief.fiveMinuteStarts.map((start, i) => (
              <FiveMinuteStartCard key={i} text={start} />
            ))}
          </div>
        </section>
      )}

      <ErrorBoundary label="open loops">
        <section aria-label="Open loops needing attention" className="space-y-3">
          <SectionHeading>Open loops needing attention</SectionHeading>
          {loops === undefined || openTasks === undefined ? (
            <LoadingState label="Loading open loops…" rows={2} />
          ) : (
            <OpenLoopsSection loops={loops} tasks={openTasks} />
          )}
        </section>
      </ErrorBoundary>

      <ErrorBoundary label="drafts awaiting approval">
        <section aria-label="Drafts awaiting approval" className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <SectionHeading>Drafts awaiting your approval</SectionHeading>
            <ResolvedDraftsSheet />
          </div>
          {pendingDrafts === undefined ? (
            <LoadingState label="Loading drafts…" rows={1} />
          ) : pendingDrafts.length === 0 ? (
            <EmptyState
              icon={InboxIcon}
              title="Nothing waiting on you"
              description="When AI drafts an email, task, or calendar block, it lands here for your yes or no."
            />
          ) : (
            <div className="space-y-3">
              {pendingDrafts.map((draft) => (
                <ApprovalDraftCard key={draft._id} draft={draft} />
              ))}
            </div>
          )}
        </section>
      </ErrorBoundary>

      <ErrorBoundary label="your calendar">
        <section aria-label="Today's calendar" className="space-y-3">
          <SectionHeading>Today's calendar</SectionHeading>
          <CalendarSection />
        </section>
      </ErrorBoundary>

      {loops !== undefined && (
        <ShutdownCta
          loops={loops}
          openTasks={openTasks ?? []}
          runsToday={runsToday}
          tasksDoneToday={tasksDoneToday ?? 0}
        />
      )}
    </div>
  );
}
