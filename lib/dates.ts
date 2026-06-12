/**
 * Date helpers shared by client and Convex.
 * Convention: calendar days are plain "YYYY-MM-DD" strings.
 * The client passes its local date for on-demand generation; cron jobs use UTC.
 * (Assumption noted in README: cron-generated briefs use the UTC day.)
 */

export function localToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Monday of the week containing the given YYYY-MM-DD date. */
export function mondayOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const diff = (d.getUTCDay() + 6) % 7; // 0 for Monday … 6 for Sunday
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

export function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Compact relative time for timestamps: "just now", "3h ago", "2d ago". */
export function formatAgo(ts: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - ts);
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < DAY_MS) return `${Math.floor(diff / 3_600_000)}h ago`;
  const days = Math.floor(diff / DAY_MS);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

/** "Jun 11" style display for a timestamp. */
export function formatDateShort(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Timestamp for 9:00am local time, `days` days from today (snooze targets). */
export function morningInDays(days: number, now: Date = new Date()): number {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  d.setHours(9, 0, 0, 0);
  return d.getTime();
}

/** "5am" / "12pm" / "8pm" display for an hour 0–23. */
export function formatHour(hour: number): string {
  if (hour === 0) return "12am";
  if (hour === 12) return "12pm";
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
}

/** "Jun 9 – Jun 15" style display for a YYYY-MM-DD week range. */
export function formatWeekRange(weekStart: string, weekEnd: string): string {
  const fmt = (s: string) =>
    new Date(`${s}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${fmt(weekStart)} – ${fmt(weekEnd)}`;
}
