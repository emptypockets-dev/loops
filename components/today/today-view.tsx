"use client";

import { useMemo, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { localToday } from "@/lib/dates";
import { ErrorBoundary } from "@/components/app/error-boundary";
import { LoadingState } from "@/components/app/loading-state";
import { ApprovalDraftCard } from "./approval-draft-card";
import { CalendarSection } from "./calendar-section";
import { FirstActionCard } from "./first-action-card";
import { OnboardingCard } from "./onboarding-card";
import { ResolvedDraftsSheet } from "./resolved-drafts-sheet";
import { UnstuckButton } from "./unstuck-button";
import { DailyBriefCard } from "./daily-brief-card";
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
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
          <p className="text-muted-foreground">{dateLabel} — what matters now, nothing more.</p>
        </div>
        <ErrorBoundary label="the unstuck button">
          <UnstuckButton />
        </ErrorBoundary>
      </header>

      <ErrorBoundary label="your first action">
        <FirstActionCard />
      </ErrorBoundary>

      <ErrorBoundary label="getting started">
        <OnboardingCard />
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
            <p className="text-sm text-muted-foreground">
              Nothing waiting on your approval. AI drafts land here for your yes or no.
            </p>
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
