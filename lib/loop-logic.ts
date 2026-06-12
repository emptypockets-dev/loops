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

/** Hour (0–23) at which each window opens. Windows gate the start of
 * "due now" but never expire it — running late is always allowed. */
export const LOOP_TIME_WINDOW_START: Record<LoopTimeOfDay, number> = {
  morning: 5,
  afternoon: 12,
  evening: 17,
  anytime: 0,
};

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
  localHour: number = new Date(now).getHours()
): LoopDueState {
  if (!loop.isActive) return "paused";
  if (loop.cadence === "ad_hoc") return "ad_hoc";
  const scheduleDue = loop.nextRunAt === undefined || loop.nextRunAt <= now;
  if (!scheduleDue) return "scheduled";
  const timeOfDay = loop.timeOfDay ?? "anytime";
  return localHour >= LOOP_TIME_WINDOW_START[timeOfDay] ? "due_now" : "later_today";
}

/** Boolean view of getLoopDueState for simple filters. */
export function isLoopDue(
  loop: LoopDueShape,
  now: number = Date.now(),
  localHour: number = new Date(now).getHours()
): boolean {
  return getLoopDueState(loop, now, localHour) === "due_now";
}
