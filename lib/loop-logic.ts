import type { Cadence, LoopTimeOfDay } from "./constants";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Next due time after completing a run, landing on a **local midnight**
 * boundary (via the caller's getTimezoneOffset() value) so daily loops are
 * due "tomorrow", not "24h after whenever you happened to finish". Monthly
 * approximates to 30 days — good enough for a nudge, never punitive.
 */
export function computeNextRunAt(
  cadence: Cadence,
  completedAt: number,
  tzOffsetMinutes = 0
): number | undefined {
  if (cadence === "ad_hoc") return undefined;
  const days = cadence === "daily" ? 1 : cadence === "weekly" ? 7 : 30;
  // Shift into the local frame, find the start of that local day, advance,
  // and shift back to real UTC milliseconds.
  const local = new Date(completedAt - tzOffsetMinutes * 60_000);
  const localDayStart = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return localDayStart + days * DAY_MS + tzOffsetMinutes * 60_000;
}

/** Per-user window boundaries: the hour (0–23) each part of the day opens.
 * Windows gate the start of "due now" but never expire it — running late is
 * always allowed. */
export interface TimeWindows {
  morningStartHour: number;
  afternoonStartHour: number;
  eveningStartHour: number;
}

export const DEFAULT_TIME_WINDOWS: TimeWindows = {
  morningStartHour: 5,
  afternoonStartHour: 12,
  eveningStartHour: 17,
};

export function windowStartHour(
  timeOfDay: LoopTimeOfDay,
  windows: TimeWindows = DEFAULT_TIME_WINDOWS
): number {
  switch (timeOfDay) {
    case "morning":
      return windows.morningStartHour;
    case "afternoon":
      return windows.afternoonStartHour;
    case "evening":
      return windows.eveningStartHour;
    case "anytime":
      return 0;
  }
}

export const LOOP_TIME_LABELS: Record<LoopTimeOfDay, string> = {
  morning: "this morning",
  afternoon: "this afternoon",
  evening: "this evening",
  anytime: "today",
};

export interface LoopDueShape {
  isActive: boolean;
  cadence: Cadence;
  nextRunAt?: number;
  timeOfDay?: LoopTimeOfDay;
}

export type LoopDueState = "due_now" | "later_today" | "scheduled" | "ad_hoc" | "paused";

/**
 * Time-aware due-ness. "later_today" means the schedule says today but the
 * loop's window hasn't opened yet (e.g. Evening Shutdown at 10am).
 */
export function getLoopDueState(
  loop: LoopDueShape,
  now: number = Date.now(),
  localHour: number = new Date(now).getHours(),
  windows: TimeWindows = DEFAULT_TIME_WINDOWS
): LoopDueState {
  if (!loop.isActive) return "paused";
  if (loop.cadence === "ad_hoc") return "ad_hoc";
  const scheduleDue = loop.nextRunAt === undefined || loop.nextRunAt <= now;
  if (!scheduleDue) return "scheduled";
  const timeOfDay = loop.timeOfDay ?? "anytime";
  return localHour >= windowStartHour(timeOfDay, windows) ? "due_now" : "later_today";
}

/** Boolean view of getLoopDueState for simple filters. */
export function isLoopDue(
  loop: LoopDueShape,
  now: number = Date.now(),
  localHour: number = new Date(now).getHours(),
  windows: TimeWindows = DEFAULT_TIME_WINDOWS
): boolean {
  return getLoopDueState(loop, now, localHour, windows) === "due_now";
}
