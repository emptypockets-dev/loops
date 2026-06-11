"use client";

import type { Doc } from "@/convex/_generated/dataModel";
import { Eye, Loader2, RefreshCw, Sparkles, Wind } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/app/empty-state";

/** The morning brief: what matters, what can wait, what's being avoided. */
export function DailyBriefCard({
  brief,
  generating,
  onGenerate,
}: {
  brief: Doc<"dailyBriefs"> | null;
  generating: boolean;
  onGenerate: () => void;
}) {
  if (!brief) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No brief for today yet"
        description="The brief reads your tasks, inbox, and loops, then names what matters and what can wait."
        action={
          <Button onClick={onGenerate} disabled={generating}>
            {generating ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles aria-hidden="true" />
            )}
            {generating ? "Generating…" : "Generate today's brief"}
          </Button>
        }
      />
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          Daily Brief
          <Badge variant="outline" className="border-dashed border-amber-600/60 bg-amber-50 text-amber-900">
            <Sparkles aria-hidden="true" /> AI generated
          </Badge>
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={onGenerate}
          disabled={generating}
          aria-label="Regenerate brief"
        >
          {generating ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw aria-hidden="true" />
          )}
          Regenerate
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="leading-relaxed">{brief.summary}</p>

        {brief.canWait.length > 0 && (
          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Wind className="h-4 w-4" aria-hidden="true" /> Can wait — really
            </h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {brief.canWait.map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden="true">·</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {brief.avoidanceWarning && (
          <div className="flex items-start gap-2 rounded-md bg-muted p-3 text-sm">
            <Eye className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p>
              <span className="font-medium">Gently: </span>
              {brief.avoidanceWarning}
            </p>
          </div>
        )}

        <Separator />
        <p className="text-center text-sm font-medium italic text-muted-foreground">
          {brief.closingLine}
        </p>
      </CardContent>
    </Card>
  );
}
