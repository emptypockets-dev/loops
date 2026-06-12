import assert from "node:assert";
import { addDaysStr, formatAgo, mondayOf, morningInDays } from "../lib/dates.ts";
import { computeNextRunAt, isLoopDue } from "../lib/loop-logic.ts";

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

// computeNextRunAt
const t = 1_000_000;
assert.equal(computeNextRunAt("daily", t), t + 24 * 3_600_000);
assert.equal(computeNextRunAt("weekly", t), t + 7 * 24 * 3_600_000);
assert.equal(computeNextRunAt("monthly", t), t + 30 * 24 * 3_600_000);
assert.equal(computeNextRunAt("ad_hoc", t), undefined);

// isLoopDue
assert.equal(isLoopDue({ isActive: true, cadence: "daily", nextRunAt: undefined }, now), true);
assert.equal(isLoopDue({ isActive: true, cadence: "daily", nextRunAt: now - 1 }, now), true);
assert.equal(isLoopDue({ isActive: true, cadence: "daily", nextRunAt: now + 1 }, now), false);
assert.equal(isLoopDue({ isActive: false, cadence: "daily", nextRunAt: now - 1 }, now), false);
assert.equal(isLoopDue({ isActive: true, cadence: "ad_hoc", nextRunAt: undefined }, now), false);
