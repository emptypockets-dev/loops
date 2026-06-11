import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Morning brief, ready before most timezones wake up (assumption: UTC day; see README).
crons.daily(
  "generate daily briefs",
  { hourUTC: 5, minuteUTC: 0 },
  internal.ai.generateDailyBriefsForAllUsers,
  {}
);

// Sunday-evening weekly review — the "review reminder" generates it so it's
// waiting on the Review screen.
crons.weekly(
  "generate weekly reviews",
  { dayOfWeek: "sunday", hourUTC: 16, minuteUTC: 0 },
  internal.ai.generateWeeklyReviewsForAllUsers,
  {}
);

export default crons;
