"use client";

import { useMemo, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import {
  Archive,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  Eye,
  Loader2,
  NotebookPen,
  RefreshCw,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { formatWeekRange, localToday, mondayOf } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/app/empty-state";
import { LoadingState } from "@/components/app/loading-state";

function ReviewSection({
  icon: Icon,
  title,
  items,
  emptyText,
}: {
  icon: LucideIcon;
  title: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {items.map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-muted-foreground" aria-hidden="true">
                  ·
                </span>
                {item}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function ReviewView() {
  const today = useMemo(() => localToday(), []);
  const weekStart = useMemo(() => mondayOf(today), [today]);
  const thisWeek = useQuery(api.reviews.getForWeek, { weekStart });
  const latest = useQuery(api.reviews.getLatest);
  const generate = useAction(api.ai.generateWeeklyReview);
  const [generating, setGenerating] = useState(false);

  const onGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const result = await generate({ date: today });
      if (!result.ok) {
        toast.error(result.error);
      } else {
        toast.success("Review ready.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Couldn't generate the review. Nothing was lost — try again.");
    } finally {
      setGenerating(false);
    }
  };

  // Prefer this week's review; otherwise show the latest one with a note.
  const review = thisWeek ?? latest ?? null;
  const loading = thisWeek === undefined || latest === undefined;
  const isCurrentWeek = review?.weekStart === weekStart;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Review</h1>
          <p className="text-muted-foreground">
            A calm look at the week. No grades, no streaks — just what happened and what's next.
          </p>
        </div>
        <Button onClick={() => void onGenerate()} disabled={generating}>
          {generating ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : review ? (
            <RefreshCw aria-hidden="true" />
          ) : (
            <Sparkles aria-hidden="true" />
          )}
          {generating ? "Generating…" : review ? "Regenerate this week" : "Generate weekly review"}
        </Button>
      </header>

      {loading ? (
        <LoadingState label="Loading your review…" rows={3} />
      ) : review === null ? (
        <EmptyState
          icon={NotebookPen}
          title="No review yet"
          description="Generate one whenever you're ready. It looks at the last seven days of tasks, inbox items, and loop runs."
          action={
            <Button onClick={() => void onGenerate()} disabled={generating}>
              <Sparkles aria-hidden="true" /> Generate weekly review
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              Week of {formatWeekRange(review.weekStart, review.weekEnd)}
            </Badge>
            <Badge
              variant="outline"
              className="border-dashed border-amber-600/60 bg-amber-50 text-amber-900"
            >
              <Sparkles aria-hidden="true" /> AI summary
            </Badge>
            {!isCurrentWeek && (
              <span className="text-sm text-muted-foreground">
                This is your most recent review — generate a fresh one for this week anytime.
              </span>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ReviewSection
              icon={CheckCircle2}
              title="Completed this week"
              items={review.completed}
              emptyText="A quiet week on the record. That's information, not a verdict."
            />
            <ReviewSection
              icon={CircleDashed}
              title="Still open"
              items={review.stillOpen}
              emptyText="Nothing lingering — open loops are all accounted for."
            />
            <ReviewSection
              icon={Archive}
              title="Can be dropped"
              items={review.dropped}
              emptyText="Nothing to drop right now. Dropping things is always allowed."
            />
            <ReviewSection
              icon={ArrowRight}
              title="Needs a next action"
              items={review.needsNextAction}
              emptyText="Everything open already has a next step. Solid."
            />
            <ReviewSection
              icon={Eye}
              title="Patterns noticed"
              items={review.patterns}
              emptyText="No strong patterns this week."
            />
            <ReviewSection
              icon={Wrench}
              title="Suggested loop improvements"
              items={review.suggestedLoopChanges}
              emptyText="Your loops look workable as they are."
            />
          </div>
        </div>
      )}
    </div>
  );
}
