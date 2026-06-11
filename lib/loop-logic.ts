import type { Cadence } from "./constants";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Next due time after completing a run. Monthly is approximated as 30 days —
 * good enough for an MVP nudge, and never punitive.
 */
export function computeNextRunAt(cadence: Cadence, completedAt: number): number | undefined {
  switch (cadence) {
    case "daily":
      return completedAt + DAY_MS;
    case "weekly":
      return completedAt + 7 * DAY_MS;
    case "monthly":
      return completedAt + 30 * DAY_MS;
    case "ad_hoc":
      return undefined;
  }
}

export interface LoopDueShape {
  isActive: boolean;
  cadence: Cadence;
  nextRunAt?: number;
}

/** A scheduled loop is "due" when it has never run or its next run time has passed. */
export function isLoopDue(loop: LoopDueShape, now: number = Date.now()): boolean {
  if (!loop.isActive || loop.cadence === "ad_hoc") return false;
  return loop.nextRunAt === undefined || loop.nextRunAt <= now;
}
