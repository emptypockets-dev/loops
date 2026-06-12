"use client";

import { useCallback, useEffect, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { CalendarDays, CalendarPlus, Loader2, RefreshCw } from "lucide-react";
import type { CalendarEventDto } from "@/lib/calendar/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState } from "@/components/app/loading-state";
import { TimeBlockDialog } from "@/components/calendar/time-block-dialog";

type SectionState =
  | { status: "loading" }
  | { status: "not_connected"; message: string }
  | { status: "error"; message: string }
  | { status: "ready"; events: CalendarEventDto[] };

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** Today's real calendar (read), plus user-initiated time blocking (write). */
export function CalendarSection() {
  const listToday = useAction(api.calendar.listToday);
  const createEvent = useAction(api.calendar.createEvent);
  const [state, setState] = useState<SectionState>({ status: "loading" });
  const [blockOpen, setBlockOpen] = useState(false);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const result = await listToday({
        timeMinIso: dayStart.toISOString(),
        timeMaxIso: dayEnd.toISOString(),
      });
      if (result.ok) {
        setState({ status: "ready", events: result.events });
      } else if (result.code === "not_connected") {
        setState({ status: "not_connected", message: result.error });
      } else {
        setState({ status: "error", message: result.error });
      }
    } catch (error) {
      console.error(error);
      setState({ status: "error", message: "Couldn't load your calendar. Your day is unchanged." });
    }
  }, [listToday]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.status === "loading") {
    return <LoadingState label="Loading your calendar…" rows={1} />;
  }

  // Not-connected and error states are one quiet line — setup prompts and
  // hiccups shouldn't take a whole card out of every day.
  if (state.status === "not_connected" || state.status === "error") {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed px-3 py-2">
        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 flex-1 text-sm text-muted-foreground">{state.message}</span>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => void load()}
        >
          <RefreshCw aria-hidden="true" /> {state.status === "error" ? "Try again" : "Check again"}
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        {state.events.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            A clear calendar today. Protect some of it before the world notices.
          </p>
        ) : (
          <ul className="space-y-2">
            {state.events.map((event) => (
              <li key={event.id} className="flex items-baseline gap-3 text-sm">
                <span className="w-32 shrink-0 tabular-nums text-muted-foreground">
                  {event.allDay ? (
                    <Badge variant="outline">all day</Badge>
                  ) : (
                    `${formatTime(event.startIso)} – ${formatTime(event.endIso)}`
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{event.title}</span>
                  {event.location && (
                    <span className="text-muted-foreground"> · {event.location}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={() => setBlockOpen(true)}>
            <CalendarPlus aria-hidden="true" /> Block time
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto text-muted-foreground"
            onClick={() => void load()}
            aria-label="Refresh calendar"
          >
            <RefreshCw aria-hidden="true" /> Refresh
          </Button>
        </div>
      </CardContent>

      {blockOpen && (
        <TimeBlockDialog
          open={blockOpen}
          onOpenChange={setBlockOpen}
          heading="Block off time"
          description="Creates an event on your Google Calendar. You're the approver here — it writes when you click."
          defaultTitle="Focus block"
          submitLabel="Add to calendar"
          onSubmit={async (input) => {
            try {
              const result = await createEvent({
                title: input.title,
                startIso: input.startIso,
                endIso: input.endIso,
              });
              if (!result.ok) {
                toast.error(result.error);
                return false;
              }
              toast.success("Time blocked on your calendar.");
              void load();
              return true;
            } catch (error) {
              console.error(error);
              toast.error("Couldn't create the event. Nothing was added.");
              return false;
            }
          }}
        />
      )}
    </Card>
  );
}
