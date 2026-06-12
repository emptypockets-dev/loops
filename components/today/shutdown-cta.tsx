"use client";

import { useState } from "react";
import type { Doc } from "@/convex/_generated/dataModel";
import { Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShutdownFlow } from "./shutdown-flow";

function momentumLine(runsToday: number, tasksDoneToday: number): string | null {
  if (runsToday === 0 && tasksDoneToday === 0) return null;
  const parts: string[] = [];
  if (runsToday > 0) parts.push(`${runsToday} loop run${runsToday === 1 ? "" : "s"}`);
  if (tasksDoneToday > 0) parts.push(`${tasksDoneToday} task${tasksDoneToday === 1 ? "" : "s"} done`);
  return `Today so far: ${parts.join(" · ")}. It counted.`;
}

/** End-of-day re-entry point: the guided shutdown ritual, from Today. */
export function ShutdownCta({
  loops,
  openTasks,
  runsToday,
  tasksDoneToday,
}: {
  loops: Doc<"loops">[];
  openTasks: Doc<"tasks">[];
  runsToday: number;
  tasksDoneToday: number;
}) {
  const [open, setOpen] = useState(false);
  const shutdownLoop = loops.find((l) => l.name === "Evening Shutdown" && l.isActive) ?? null;
  const momentum = momentumLine(runsToday, tasksDoneToday);

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3 p-4">
        <Moon className="h-5 w-5 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">Done for today?</p>
          <p className="text-sm text-muted-foreground">
            {momentum ?? "Close the day on purpose so your head doesn't have to carry it overnight."}
          </p>
        </div>
        <Button variant="outline" onClick={() => setOpen(true)}>
          Run Evening Shutdown
        </Button>
      </CardContent>
      {open && (
        <ShutdownFlow
          loop={shutdownLoop}
          openTasks={openTasks}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </Card>
  );
}
