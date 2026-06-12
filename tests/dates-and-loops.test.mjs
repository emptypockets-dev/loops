import assert from "node:assert";
import { addDaysStr, formatAgo, formatHour, mondayOf, morningInDays } from "../lib/dates.ts";
import { computeNextRunAt, getLoopDueState, isLoopDue } from "../lib/loop-logic.ts";

// mondayOf: 2026-06-12 is a Friday → Monday is 2026-06-08
assert.equal(mondayOf("2026-06-12"), "2026-06-08");
assert.equal(mondayOf("2026-06-08"), "2026-06-08"); // Monday maps to itself
assert.equal(mondayOf("2026-06-14"), "2026-06-08"); // Sunday belongs to the prior Monday

assert.equal(addDaysStr("2026-06-08", 6), "2026-06-14");
assert.equal(addDaysStr("2026-12-30", 5), "2027-01-04"); // year rollover

// formatAgo
const now = Date.now();
assert.equal(formatAgo(now, now), "just now");
assert.equal(formatAgo(now - 5 * 60_000, now), "5m ago");
assert.equal(formatAgo(now - 3 * 3_600_000, now), "3h ago");
assert.equal(formatAgo(now - 26 * 3_600_000, now), "yesterday");

// morningInDays lands on 9:00 local
const snooze = new Date(morningInDays(1, new Date("2026-06-12T22:30:00")));
assert.equal(snooze.getHours(), 9);
assert.equal(snooze.getDate(), 13);

// computeNextRunAt lands on local-midnight boundaries
const done = Date.UTC(2026, 5, 12, 22, 30); // Jun 12 22:30 UTC, offset 0
assert.equal(computeNextRunAt("daily", done, 0), Date.UTC(2026, 5, 13));
assert.equal(computeNextRunAt("weekly", done, 0), Date.UTC(2026, 5, 19));
assert.equal(computeNextRunAt("monthly", done, 0), Date.UTC(2026, 6, 12));
assert.equal(computeNextRunAt("ad_hoc", done, 0), undefined);
// Completed 21:00 local in UTC-5 (= Jun 12 02:00 UTC) → next local midnight = Jun 12 05:00 UTC
assert.equal(computeNextRunAt("daily", Date.UTC(2026, 5, 12, 2, 0), 300), Date.UTC(2026, 5, 12, 5, 0));
// Default offset behaves like UTC
assert.equal(computeNextRunAt("daily", done), Date.UTC(2026, 5, 13));

// getLoopDueState: time-of-day windows gate "due now" but never expire it
const base = { isActive: true, cadence: "daily", nextRunAt: undefined };
assert.equal(getLoopDueState({ ...base, timeOfDay: "evening" }, now, 9), "later_today");
assert.equal(getLoopDueState({ ...base, timeOfDay: "evening" }, now, 17), "due_now");
assert.equal(getLoopDueState({ ...base, timeOfDay: "evening" }, now, 23), "due_now");
assert.equal(getLoopDueState({ ...base, timeOfDay: "morning" }, now, 4), "later_today");
assert.equal(getLoopDueState({ ...base, timeOfDay: "morning" }, now, 8), "due_now");
assert.equal(getLoopDueState({ ...base, timeOfDay: "morning" }, now, 20), "due_now"); // late is allowed
assert.equal(getLoopDueState({ ...base, timeOfDay: "afternoon" }, now, 11), "later_today");
assert.equal(getLoopDueState({ ...base, timeOfDay: "afternoon" }, now, 13), "due_now");
assert.equal(getLoopDueState(base, now, 0), "due_now"); // undefined timeOfDay = anytime
assert.equal(getLoopDueState({ ...base, nextRunAt: now + 1000 }, now, 12), "scheduled");
assert.equal(getLoopDueState({ ...base, cadence: "ad_hoc" }, now, 12), "ad_hoc");
assert.equal(getLoopDueState({ ...base, isActive: false }, now, 12), "paused");

// Custom per-user windows: evening starting at 8pm
const nightOwl = { morningStartHour: 7, afternoonStartHour: 13, eveningStartHour: 20 };
assert.equal(getLoopDueState({ ...base, timeOfDay: "evening" }, now, 18, nightOwl), "later_today");
assert.equal(getLoopDueState({ ...base, timeOfDay: "evening" }, now, 20, nightOwl), "due_now");
assert.equal(getLoopDueState({ ...base, timeOfDay: "morning" }, now, 6, nightOwl), "later_today");
assert.equal(getLoopDueState({ ...base, timeOfDay: "morning" }, now, 7, nightOwl), "due_now");

// isLoopDue stays the boolean view
assert.equal(isLoopDue({ ...base, timeOfDay: "evening" }, now, 9), false);
assert.equal(isLoopDue({ ...base, timeOfDay: "evening" }, now, 19), true);
assert.equal(isLoopDue({ ...base, timeOfDay: "evening" }, now, 19, nightOwl), false);
assert.equal(isLoopDue({ ...base, nextRunAt: now + 1 }, now, 12), false);
assert.equal(isLoopDue({ ...base, nextRunAt: now - 1 }, now, 12), true);

// formatHour
assert.equal(formatHour(0), "12am");
assert.equal(formatHour(5), "5am");
assert.equal(formatHour(12), "12pm");
assert.equal(formatHour(20), "8pm");
