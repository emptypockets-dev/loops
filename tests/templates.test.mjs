import assert from "node:assert";
import {
  buildDailyBriefEmail,
  buildWeeklyReviewEmail,
  formatBriefDate,
} from "../lib/email/templates.ts";

assert.equal(formatBriefDate("2026-06-12"), "Friday, June 12");
assert.equal(formatBriefDate("garbage"), "garbage");

const brief = buildDailyBriefEmail({
  date: "2026-06-12",
  summary: "Light day. Two meetings & one deadline.",
  topOutcomes: ["Ship the report", "Call the <landlord>"],
  fiveMinuteStarts: ["Open the report doc"],
  canWait: ["Garage shelving"],
  avoidanceWarning: "The lease email is 9 days old.",
  closingLine: "This is enough for today.",
  appUrl: "https://loops.example.com",
});
assert.ok(brief.subject.includes("Friday, June 12"));
assert.ok(brief.textBody.includes("Ship the report"));
assert.ok(brief.textBody.includes("This is enough for today."));
assert.ok(brief.textBody.includes("https://loops.example.com/today"));
// HTML-escapes user content, keeps markup intact
assert.ok(brief.htmlBody.includes("Call the &lt;landlord&gt;"));
assert.ok(brief.htmlBody.includes("&amp;"));
assert.ok(brief.htmlBody.includes('href="https://loops.example.com/today"'));
assert.ok(!brief.htmlBody.includes("<landlord>"));

// No app URL → no links anywhere
const noUrl = buildDailyBriefEmail({
  date: "2026-06-12",
  summary: "S",
  topOutcomes: [],
  fiveMinuteStarts: [],
  canWait: [],
  closingLine: "This is enough for today.",
  appUrl: null,
});
assert.ok(!noUrl.textBody.includes("http"));
assert.ok(!noUrl.htmlBody.includes("<a "));

const review = buildWeeklyReviewEmail({
  weekStart: "2026-06-08",
  weekEnd: "2026-06-14",
  completed: ["Paid the bill", "Ran Money/Admin loop"],
  patterns: ["Money items wait until they feel urgent"],
  needsNextAction: ["Lease renewal"],
  appUrl: "https://loops.example.com",
});
assert.ok(review.textBody.includes("Paid the bill"));
assert.ok(review.htmlBody.includes("loops.example.com/review"));

// Empty week → calm copy, no crash
const quiet = buildWeeklyReviewEmail({
  weekStart: "2026-06-08",
  weekEnd: "2026-06-14",
  completed: [],
  patterns: [],
  needsNextAction: [],
  appUrl: null,
});
assert.ok(quiet.textBody.includes("quiet week"));
